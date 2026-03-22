package com.example.user;

import com.example.user.exception.FakeInternalException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;

/**
 * V2 API — same logic as V1 but with manual @WithSpan instrumentation
 * to demonstrate the difference between:
 *   - V1: zero-code (auto) instrumentation — CPU methods invisible in trace
 *   - V2: code instrumentation with @WithSpan — CPU methods visible as spans
 */
@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {
    @Autowired
    private UserService userService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${point.service.url:http://point-service:8001}")
    private String pointServiceUrl;

    private final Random random;
    private final Logger logger;

    public UserControllerV2(UserService userService) {
        this.userService = userService;
        this.random = new Random(0);
        this.logger = LoggerFactory.getLogger(UserControllerV2.class);
    }

    @GetMapping("/{id}")
    public Map<String, Object> getUserById(@PathVariable Long id) {

        // Simulate request error
        if (random.nextInt(3) > 1) {
            throw new FakeInternalException("Failed to fetch user id %d".formatted(id));
        }

        logger.info("Fetching user id {}", id);

        User user = userService.getUserById(id);

        // CPU-intensive work — now with @WithSpan so it appears in trace
        String loyaltyTier = calculateLoyaltyTier(id);

        // Call point-service to get user's points
        Object pointData = null;
        try {
            String pointUrl = pointServiceUrl + "/api/v2/point";
            pointData = restTemplate.getForObject(pointUrl, List.class);
            logger.info("Got points data for user {}", id);
        } catch (Exception e) {
            logger.warn("Failed to fetch points for user {}: {}", id, e.getMessage());
        }

        // CPU-intensive work — now with @WithSpan so it appears in trace
        double recommendationScore = buildRecommendationScore(id);

        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("points", pointData);
        result.put("loyaltyTier", loyaltyTier);
        result.put("recommendationScore", recommendationScore);
        return result;
    }

    /**
     * @WithSpan creates a child span named "UserControllerV2.calculateLoyaltyTier"
     * visible in the trace timeline — compare with V1 where this is invisible
     */
    @WithSpan
    private String calculateLoyaltyTier(@SpanAttribute("userId") Long userId) {
        long hash = userId;
        for (int i = 0; i < 30_000_000; i++) {
            hash = hash * 31 + i;
            hash = hash ^ (hash >>> 16);
        }
        String[] tiers = {"Bronze", "Silver", "Gold", "Platinum"};
        return tiers[(int) (Math.abs(hash) % tiers.length)];
    }

    /**
     * @WithSpan creates a child span named "UserControllerV2.buildRecommendationScore"
     * visible in the trace timeline — compare with V1 where this is invisible
     */
    @WithSpan
    private double buildRecommendationScore(@SpanAttribute("userId") Long userId) {
        double score = 0.0;
        for (int i = 0; i < 5_000_000; i++) {
            score += Math.sin(i * 0.001 + userId) * Math.cos(i * 0.002);
            score = Math.abs(score) % 1000.0;
        }
        return Math.round(score * 100.0) / 100.0;
    }
}
