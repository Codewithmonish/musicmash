package com.musicmash.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "practice_sessions")
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "song_title")
    private String songTitle;

    private String instrument;

    private String difficulty;

    @Column(name = "accuracy_score")
    private Integer accuracyScore;

    @Column(name = "timing_score")
    private Integer timingScore;

    @Column(name = "max_combo")
    private Integer maxCombo;

    @Column(name = "xp_earned")
    private Integer xpEarned;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /** Exercise from the library that was practised (null for older sessions). */
    @Column(name = "exercise_id")
    private Long exerciseId;

    /** AI-service analysis the scores came from (null for sessions recorded before real scoring). */
    @Column(name = "analysis_id")
    private Long analysisId;

    @Column(name = "completed_at", updatable = false)
    private LocalDateTime completedAt = LocalDateTime.now();

    public PracticeSession() {}

    public PracticeSession(User user, String songTitle, String instrument, String difficulty, Integer accuracyScore, Integer timingScore, Integer maxCombo, Integer xpEarned, Integer durationSeconds) {
        this.user = user;
        this.songTitle = songTitle;
        this.instrument = instrument;
        this.difficulty = difficulty;
        this.accuracyScore = accuracyScore;
        this.timingScore = timingScore;
        this.maxCombo = maxCombo;
        this.xpEarned = xpEarned;
        this.durationSeconds = durationSeconds;
    }

    public Long getExerciseId() { return exerciseId; }
    public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }

    public Long getAnalysisId() { return analysisId; }
    public void setAnalysisId(Long analysisId) { this.analysisId = analysisId; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getSongTitle() { return songTitle; }
    public void setSongTitle(String songTitle) { this.songTitle = songTitle; }

    public String getInstrument() { return instrument; }
    public void setInstrument(String instrument) { this.instrument = instrument; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getAccuracyScore() { return accuracyScore; }
    public void setAccuracyScore(Integer accuracyScore) { this.accuracyScore = accuracyScore; }

    public Integer getTimingScore() { return timingScore; }
    public void setTimingScore(Integer timingScore) { this.timingScore = timingScore; }

    public Integer getMaxCombo() { return maxCombo; }
    public void setMaxCombo(Integer maxCombo) { this.maxCombo = maxCombo; }

    public Integer getXpEarned() { return xpEarned; }
    public void setXpEarned(Integer xpEarned) { this.xpEarned = xpEarned; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
