package com.musicmash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.musicmash.entity.Exercise;
import com.musicmash.entity.PracticeSession;
import com.musicmash.entity.User;
import com.musicmash.entity.UserStats;
import com.musicmash.repository.ExerciseRepository;
import com.musicmash.repository.PracticeSessionRepository;
import com.musicmash.repository.UserRepository;
import com.musicmash.repository.UserStatsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Practice Arena: the exercise library, real scored sessions, stats and history.
 *
 * Scores are never taken from the client. A session points at a finished AI analysis of the
 * recorded attempt; this service reads that analysis from the AI service and stores its
 * measured intonation and rhythm scores. XP = round(exercise XP x overall score / 100).
 */
@Service
public class PracticeService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private final NotificationService notificationService;
    private final AIIntegrationService aiIntegrationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PracticeService(PracticeSessionRepository practiceSessionRepository,
                           UserStatsRepository userStatsRepository,
                           UserRepository userRepository,
                           ExerciseRepository exerciseRepository,
                           NotificationService notificationService,
                           AIIntegrationService aiIntegrationService) {
        this.practiceSessionRepository = practiceSessionRepository;
        this.userStatsRepository = userStatsRepository;
        this.userRepository = userRepository;
        this.exerciseRepository = exerciseRepository;
        this.notificationService = notificationService;
        this.aiIntegrationService = aiIntegrationService;
    }

    /** All exercises, or those for one instrument plus the ones any instrument can play. */
    public List<Exercise> getExercises(String instrument) {
        if (instrument == null || instrument.isBlank()) {
            return exerciseRepository.findAllByOrderByDifficultyAscTitleAsc();
        }
        return exerciseRepository.findByInstrumentInOrderByDifficultyAscTitleAsc(List.of(instrument.toUpperCase(), "ANY"));
    }

    public UserStats getUserStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userStatsRepository.findByUserId(userId)
                .orElseGet(() -> userStatsRepository.save(new UserStats(user)));
    }

    /** Measured scores from an AI analysis result (any of them may be null = not measurable). */
    public record MeasuredScores(Double intonation, Double rhythm, Double overall) {}

    /** Read skill_prediction scores from the AI service's /result JSON. */
    public static MeasuredScores parseScores(JsonNode result) {
        JsonNode skill = result.path("skill_prediction");
        return new MeasuredScores(number(skill, "intonation_score"), number(skill, "rhythm_score"),
                number(skill, "overall_score"));
    }

    private static Double number(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asDouble();
    }

    /** XP for an attempt: the exercise's full reward scaled by the measured overall score (0 if none). */
    public static int xpFor(int xpReward, Double overallScore) {
        if (overallScore == null) {
            return 0;
        }
        return (int) Math.round(xpReward * Math.max(0, Math.min(100, overallScore)) / 100.0);
    }

    @Transactional
    public Map<String, Object> recordPracticeSession(Long userId, Long exerciseId, Long analysisId, Integer durationSeconds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercise not found"));
        MeasuredScores scores = fetchScores(analysisId);
        int xp = xpFor(exercise.getXpReward(), scores.overall());

        PracticeSession session = new PracticeSession(user, exercise.getTitle(), exercise.getInstrument(),
                exercise.getDifficulty(), round(scores.intonation()), round(scores.rhythm()), null, xp,
                durationSeconds != null ? durationSeconds : exercise.getDurationSeconds());
        session.setExerciseId(exercise.getId());
        session.setAnalysisId(analysisId);
        practiceSessionRepository.save(session);

        UserStats stats = getUserStats(userId);
        int previousLevel = stats.getLevel();
        stats.addXp(xp);
        stats.setExercisesCompleted(stats.getExercisesCompleted() + 1);
        stats.setTotalPracticeMinutes(stats.getTotalPracticeMinutes() + Math.max(1, session.getDurationSeconds() / 60));

        LocalDate today = LocalDate.now();
        if (stats.getLastPracticeDate() == null || stats.getLastPracticeDate().isBefore(today.minusDays(1))) {
            stats.setStreak(1);
        } else if (stats.getLastPracticeDate().equals(today.minusDays(1))) {
            stats.setStreak(stats.getStreak() + 1);
        }
        boolean firstSessionToday = !today.equals(stats.getLastPracticeDate());
        stats.setLastPracticeDate(today);
        userStatsRepository.save(stats);

        boolean streakMilestone = firstSessionToday && (stats.getStreak() == 7 || stats.getStreak() == 30);
        if (streakMilestone) {
            notificationService.createNotification(user, "ACHIEVEMENT", "Streak milestone",
                    "You practised " + stats.getStreak() + " days in a row.");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("session", sessionView(session));
        response.put("xpEarned", xp);
        response.put("scores", scores);
        response.put("stats", statsView(stats));
        response.put("levelUp", stats.getLevel() > previousLevel);
        response.put("streakMilestone", streakMilestone);
        return response;
    }

    private MeasuredScores fetchScores(Long analysisId) {
        if (analysisId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "analysisId is required: sessions are scored from a real analysis");
        }
        ResponseEntity<String> response = aiIntegrationService.getAnalysisResult(analysisId);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The analysis is not finished, so the session cannot be scored yet");
        }
        try {
            return parseScores(objectMapper.readTree(response.getBody()));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not read the analysis result", e);
        }
    }

    /** The user's most recent sessions, newest first. */
    public List<Map<String, Object>> getRecentSessions(Long userId) {
        return practiceSessionRepository.findTop10ByUserIdOrderByCompletedAtDesc(userId).stream()
                .map(PracticeService::sessionView).toList();
    }

    /** One entry per day with practice in the last ``days`` days: date, sessions, minutes, xp. */
    public List<Map<String, Object>> getHistory(Long userId, int days) {
        LocalDateTime since = LocalDate.now().minusDays(Math.max(1, Math.min(days, 400)) - 1L).atStartOfDay();
        Map<LocalDate, int[]> byDay = new TreeMap<>();
        for (PracticeSession session : practiceSessionRepository.findByUserIdAndCompletedAtAfterOrderByCompletedAtAsc(userId, since)) {
            int[] totals = byDay.computeIfAbsent(session.getCompletedAt().toLocalDate(), d -> new int[3]);
            totals[0] += 1;
            totals[1] += session.getDurationSeconds() != null ? session.getDurationSeconds() : 0;
            totals[2] += session.getXpEarned() != null ? session.getXpEarned() : 0;
        }
        List<Map<String, Object>> history = new ArrayList<>();
        byDay.forEach((day, totals) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", day.toString());
            entry.put("sessions", totals[0]);
            entry.put("minutes", Math.round(totals[1] / 60.0 * 10) / 10.0);
            entry.put("xp", totals[2]);
            history.add(entry);
        });
        return history;
    }

    private static Integer round(Double value) {
        return value == null ? null : (int) Math.round(value);
    }

    private static Map<String, Object> sessionView(PracticeSession session) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", session.getId());
        view.put("exerciseId", session.getExerciseId());
        view.put("analysisId", session.getAnalysisId());
        view.put("title", session.getSongTitle());
        view.put("instrument", session.getInstrument());
        view.put("difficulty", session.getDifficulty());
        view.put("intonationScore", session.getAccuracyScore());
        view.put("rhythmScore", session.getTimingScore());
        view.put("xpEarned", session.getXpEarned());
        view.put("durationSeconds", session.getDurationSeconds());
        view.put("completedAt", session.getCompletedAt());
        return view;
    }

    private static Map<String, Object> statsView(UserStats stats) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("totalXp", stats.getTotalXp());
        view.put("level", stats.getLevel());
        view.put("streak", stats.getStreak());
        view.put("totalPracticeMinutes", stats.getTotalPracticeMinutes());
        view.put("exercisesCompleted", stats.getExercisesCompleted());
        return view;
    }
}
