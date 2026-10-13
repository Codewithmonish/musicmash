package com.musicmash.controller;

import com.musicmash.entity.Achievement;
import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.AchievementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/achievements")
@CrossOrigin(origins = "*")
public class AchievementController {

    private final AchievementService achievementService;
    private final UserRepository userRepository;

    public AchievementController(AchievementService achievementService, UserRepository userRepository) {
        this.achievementService = achievementService;
        this.userRepository = userRepository;
    }

    @GetMapping("/user")
    public ResponseEntity<List<Achievement>> getUserAchievements(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(achievementService.getUserAchievements(user.getId()));
    }
}
