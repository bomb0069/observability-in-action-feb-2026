package com.example.user;

import com.example.user.exception.FakeInternalException;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
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

    private final Random random;

    private Logger logger;

    public UserController(UserService userService) {
        this.userService = userService;
        random = new Random(0);

        this.logger = LoggerFactory.getLogger(UserController.class);
    }

    @GetMapping("/{id}")
    public Map<String, Object> getUserById(@PathVariable Long id) {

        // Simulate request error (1 in 20 requests)
        if (random.nextInt(20) == 0) {
            throw new FakeInternalException("Failed to fetch user id %d".formatted(id));
        }

        logger.info("Fetching user id {}", id);

        User user = userService.getUserById(id);
        
        // Fetch user points from point-service (distributed tracing!)
        Map<String, Object> response = new HashMap<>();
        response.put("user", user);
        
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
        
        return response;
    }
}