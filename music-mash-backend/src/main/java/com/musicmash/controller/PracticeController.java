package com.musicmash.controller;

import com.musicmash.entity.Exercise;
import com.musicmash.entity.User;
import com.musicmash.entity.UserStats;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.PracticeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
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
    public ResponseEntity<List<Exercise>> getExercises(@RequestParam(required = false) String instrument) {
        return ResponseEntity.ok(practiceService.getExercises(instrument));
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStats> getUserStats(Authentication authentication) {
        return ResponseEntity.ok(practiceService.getUserStats(currentUser(authentication).getId()));
    }

    /**
     * Record a practice attempt. Body: {exerciseId, analysisId, durationSeconds}. The scores and
     * XP come from the finished AI analysis of the attempt, never from the client.
     */
    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> recordSession(@RequestBody Map<String, Object> body, Authentication authentication) {
        Long exerciseId = asLong(body.get("exerciseId"));
        if (exerciseId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "exerciseId is required");
        }
        Integer duration = body.get("durationSeconds") != null ? (int) Math.round(Double.parseDouble(body.get("durationSeconds").toString())) : null;
        return ResponseEntity.ok(practiceService.recordPracticeSession(
                currentUser(authentication).getId(), exerciseId, asLong(body.get("analysisId")), duration));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<Map<String, Object>>> recentSessions(Authentication authentication) {
        return ResponseEntity.ok(practiceService.getRecentSessions(currentUser(authentication).getId()));
    }

    /** Practice per day for the heatmap: [{date, sessions, minutes, xp}]. */
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> history(@RequestParam(defaultValue = "365") int days,
                                                             Authentication authentication) {
        return ResponseEntity.ok(practiceService.getHistory(currentUser(authentication).getId(), days));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private static Long asLong(Object value) {
        return value == null ? null : Long.valueOf(value.toString());
    }
}
