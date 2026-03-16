package com.example.user;

import com.example.user.exception.FakeInternalException;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    @Autowired
    private UserService userService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${point.service.url:http://point-service:8001}")
    private String pointServiceUrl;

    @Value("${store.service.url:http://store-service:8000}")
    private String storeServiceUrl;

    private final Random random;
    private final Logger logger;
    private final Tracer tracer;

    public UserController(UserService userService) {
        this.userService = userService;
        random = new Random(0);
        this.logger = LoggerFactory.getLogger(UserController.class);
        this.tracer = GlobalOpenTelemetry.getTracer("user-service");
    }

    @GetMapping("/{id}")
    public Map<String, Object> getUserById(@PathVariable Long id) {
        long startTime = System.nanoTime();
        Span span = tracer.spanBuilder("UserController.getUserById").startSpan();

        logger.info("function_execution",
                StructuredArguments.keyValue("function", "getUserById"),
                StructuredArguments.keyValue("event", "start"),
                StructuredArguments.keyValue("user_id", id));

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("user.id", id);

            // Simulate request error (1 in 20 requests)
            if (random.nextInt(20) == 0) {
                throw new FakeInternalException("Failed to fetch user id %d".formatted(id));
            }

            logger.info("Fetching user id {}", id);

            User user = userService.getUserById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);

            // Fetch user points from point-service
            try {
                String pointUrl = pointServiceUrl + "/api/v1/points/user/" + id + "/total";
                logger.info("Calling point service at: {}", pointUrl);

                @SuppressWarnings("unchecked")
                Map<String, Object> pointData = restTemplate.getForObject(pointUrl, Map.class);
                response.put("points", pointData);
            } catch (Exception e) {
                logger.warn("Failed to fetch points for user {}: {}", id, e.getMessage());
                response.put("points", Map.of("error", "Points service unavailable"));
            }

            // Fetch product info from store-service
            try {
                String storeUrl = storeServiceUrl + "/api/v1/product/" + id;
                logger.info("Calling store service at: {}", storeUrl);

                @SuppressWarnings("unchecked")
                Map<String, Object> productData = restTemplate.getForObject(storeUrl, Map.class);
                response.put("product", productData);
            } catch (Exception e) {
                logger.warn("Failed to fetch product for user {}: {}", id, e.getMessage());
                response.put("product", Map.of("error", "Store service unavailable"));
            }

            long durationMs = (System.nanoTime() - startTime) / 1_000_000;
            logger.info("function_execution",
                    StructuredArguments.keyValue("function", "getUserById"),
                    StructuredArguments.keyValue("event", "end"),
                    StructuredArguments.keyValue("duration_ms", durationMs),
                    StructuredArguments.keyValue("user_id", id));

            span.setAttribute("duration_ms", durationMs);
            return response;
        } catch (Exception e) {
            long durationMs = (System.nanoTime() - startTime) / 1_000_000;
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            logger.error("function_execution",
                    StructuredArguments.keyValue("function", "getUserById"),
                    StructuredArguments.keyValue("event", "end"),
                    StructuredArguments.keyValue("duration_ms", durationMs),
                    StructuredArguments.keyValue("error", e.getMessage()));
            throw e;
        } finally {
            span.end();
        }
    }
}
