package com.musicmash.controller;

import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.SocialService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {

    private final SocialService socialService;
    private final UserRepository userRepository;

    public SocialController(SocialService socialService, UserRepository userRepository) {
        this.socialService = socialService;
        this.userRepository = userRepository;
    }

    @GetMapping("/discover")
    public ResponseEntity<List<Map<String, Object>>> discover(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(socialService.discoverMusicians(user.getId()));
    }

    @PostMapping("/follow/{userId}")
    public ResponseEntity<Map<String, Object>> follow(@PathVariable Long userId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(socialService.followUser(user.getId(), userId));
    }

    @DeleteMapping("/unfollow/{userId}")
    public ResponseEntity<Map<String, Object>> unfollow(@PathVariable Long userId, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(socialService.unfollowUser(user.getId(), userId));
    }
}
