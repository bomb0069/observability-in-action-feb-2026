package com.example.user;

import com.example.user.exception.NotFoundException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private Logger logger;

    @Autowired
    private UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.logger = LoggerFactory.getLogger(UserService.class);
        this.userRepository = userRepository;
    }

    // Create a new user
    public User createUser(User user) {
        logger.info("Creating user");
        var newUser = userRepository.save(user);
        return newUser;
    }

    // Get all users
    public List<User> getAllUsers() {
        logger.info("Fetching all users");
        var users = userRepository.findAll();
        return users;
    }

    // Get user by ID
    public User getUserById(Long id) {
        logger.info("Fetching users by id: {}", id);
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Invalid id: %d".formatted(id)));
    }

}