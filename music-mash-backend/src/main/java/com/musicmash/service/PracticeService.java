package com.musicmash.service;

import com.musicmash.entity.PracticeSession;
import com.musicmash.entity.User;
import com.musicmash.entity.UserStats;
import com.musicmash.repository.PracticeSessionRepository;
import com.musicmash.repository.UserRepository;
import com.musicmash.repository.UserStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class PracticeService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public PracticeService(PracticeSessionRepository practiceSessionRepository,
                           UserStatsRepository userStatsRepository,
                           UserRepository userRepository,
                           NotificationService notificationService) {
        this.practiceSessionRepository = practiceSessionRepository;
        this.userStatsRepository = userStatsRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<Map<String, Object>> getAvailableExercises(String instrument) {
        List<Map<String, Object>> exercises = new ArrayList<>();

        exercises.add(createExerciseMap(1L, "Canon in D Repertoire", "Pachelbel Classic", "BEGINNER", 110, 120, "classical"));
        exercises.add(createExerciseMap(2L, "Autumn Leaves Cadence", "Jazz Standard", "INTERMEDIATE", 140, 150, "jazz"));
        exercises.add(createExerciseMap(3L, "Flight of the Bumblebee", "Korsakov Technical", "ADVANCED", 180, 250, "technical"));
        exercises.add(createExerciseMap(4L, "Chromatic Warm-up Drill", "Daily Finger Agility", "BEGINNER", 90, 80, "warmup"));
        exercises.add(createExerciseMap(5L, "Pentatonic Soloing Loop", "Improv Groove", "INTERMEDIATE", 120, 160, "improv"));

        return exercises;
    }

    private Map<String, Object> createExerciseMap(Long id, String title, String subtitle, String difficulty, int bpm, int xp, String category) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("title", title);
        map.put("subtitle", subtitle);
        map.put("difficulty", difficulty);
        map.put("bpm", bpm);
        map.put("xpReward", xp);
        map.put("category", category);
        return map;
    }

    public UserStats getUserStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return userStatsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserStats newStats = new UserStats(user);
                    return userStatsRepository.save(newStats);
                });
    }

    @Transactional
    public Map<String, Object> recordPracticeSession(Long userId, String songTitle, String instrument, String difficulty, Integer accuracy, Integer timing, Integer combo, Integer xpEarned, Integer durationSeconds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PracticeSession session = new PracticeSession(user, songTitle, instrument, difficulty, accuracy, timing, combo, xpEarned, durationSeconds);
        practiceSessionRepository.save(session);

        UserStats stats = getUserStats(userId);
        stats.addXp(xpEarned != null ? xpEarned : 100);
        stats.setExercisesCompleted(stats.getExercisesCompleted() + 1);
        stats.setTotalPracticeMinutes(stats.getTotalPracticeMinutes() + Math.max(1, (durationSeconds != null ? durationSeconds : 60) / 60));

        LocalDate today = LocalDate.now();
        if (stats.getLastPracticeDate() == null || stats.getLastPracticeDate().isBefore(today.minusDays(1))) {
            stats.setStreak(1);
        } else if (stats.getLastPracticeDate().equals(today.minusDays(1))) {
            stats.setStreak(stats.getStreak() + 1);
        }
        stats.setLastPracticeDate(today);
        userStatsRepository.save(stats);

        if (stats.getStreak() == 7 || stats.getStreak() == 30) {
            notificationService.createNotification(
                    user,
                    "ACHIEVEMENT",
                    "Streak Milestone Unlocked!",
                    "Congratulations! You maintained a " + stats.getStreak() + "-day practice streak."
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("session", session);
        response.put("updatedStats", stats);
        return response;
    }
}
