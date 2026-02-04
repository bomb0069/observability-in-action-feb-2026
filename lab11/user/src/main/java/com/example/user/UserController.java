package com.example.user;

import com.example.user.exception.FakeInternalException;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    @Autowired
    private UserService userService;

    private final Random random;

    private Logger logger;

    public UserController(UserService userService) {
        this.userService = userService;
        random = new Random(0);

        this.logger = LoggerFactory.getLogger(UserController.class);
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {

        // Simulate request error
        if (random.nextInt(3) > 1) {
            throw new FakeInternalException("Failed to fetch user id %d".formatted(id));
        }

        logger.info("Fetching user id {}", id);

        return userService.getUserById(id);
    }
}