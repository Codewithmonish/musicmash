package com.musicmash.controller;

import com.musicmash.entity.User;
import com.musicmash.entity.UserStats;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.PracticeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/practice")
@CrossOrigin(origins = "*")
public class PracticeController {

    private final PracticeService practiceService;
    private final UserRepository userRepository;

    public PracticeController(PracticeService practiceService, UserRepository userRepository) {
        this.practiceService = practiceService;
        this.userRepository = userRepository;
    }

    @GetMapping("/exercises")
    public ResponseEntity<List<Map<String, Object>>> getExercises(@RequestParam(required = false, defaultValue = "PIANO") String instrument) {
        return ResponseEntity.ok(practiceService.getAvailableExercises(instrument));
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStats> getUserStats(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(practiceService.getUserStats(user.getId()));
    }

    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> recordSession(@RequestBody Map<String, Object> body, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String songTitle = (String) body.getOrDefault("songTitle", "Practice Track");
        String instrument = (String) body.getOrDefault("instrument", "GUITAR");
        String difficulty = (String) body.getOrDefault("difficulty", "INTERMEDIATE");
        Integer accuracy = body.get("accuracy") != null ? Integer.parseInt(body.get("accuracy").toString()) : 85;
        Integer timing = body.get("timing") != null ? Integer.parseInt(body.get("timing").toString()) : 90;
        Integer combo = body.get("maxCombo") != null ? Integer.parseInt(body.get("maxCombo").toString()) : 24;
        Integer xpEarned = body.get("xpEarned") != null ? Integer.parseInt(body.get("xpEarned").toString()) : 150;
        Integer duration = body.get("durationSeconds") != null ? Integer.parseInt(body.get("durationSeconds").toString()) : 120;

        Map<String, Object> result = practiceService.recordPracticeSession(user.getId(), songTitle, instrument, difficulty, accuracy, timing, combo, xpEarned, duration);
        return ResponseEntity.ok(result);
    }
}
