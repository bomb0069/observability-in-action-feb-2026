package com.example.user;

import com.example.user.exception.NotFoundException;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import java.util.List;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final Logger logger;
    private final Tracer tracer;

    @Autowired
    private UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.logger = LoggerFactory.getLogger(UserService.class);
        this.tracer = GlobalOpenTelemetry.getTracer("user-service");
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        logger.info("Creating user");
        var newUser = userRepository.save(user);
        return newUser;
    }

    public List<User> getAllUsers() {
        logger.info("Fetching all users");
        var users = userRepository.findAll();
        return users;
    }

    public User getUserById(Long id) {
        long startTime = System.nanoTime();
        Span span = tracer.spanBuilder("UserService.getUserById").startSpan();

        logger.info("function_execution",
                StructuredArguments.keyValue("function", "UserService.getUserById"),
                StructuredArguments.keyValue("event", "start"),
                StructuredArguments.keyValue("user_id", id));

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("user.id", id);

            User user = userRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Invalid id: %d".formatted(id)));

            long durationMs = (System.nanoTime() - startTime) / 1_000_000;
            logger.info("function_execution",
                    StructuredArguments.keyValue("function", "UserService.getUserById"),
                    StructuredArguments.keyValue("event", "end"),
                    StructuredArguments.keyValue("duration_ms", durationMs),
                    StructuredArguments.keyValue("user_id", id));

            span.setAttribute("duration_ms", durationMs);
            return user;
        } catch (Exception e) {
            long durationMs = (System.nanoTime() - startTime) / 1_000_000;
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            logger.error("function_execution",
                    StructuredArguments.keyValue("function", "UserService.getUserById"),
                    StructuredArguments.keyValue("event", "end"),
                    StructuredArguments.keyValue("duration_ms", durationMs),
                    StructuredArguments.keyValue("error", e.getMessage()));
            throw e;
        } finally {
            span.end();
        }
    }
}
