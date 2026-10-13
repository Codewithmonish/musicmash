package com.musicmash.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations", indexes = {
    @Index(name = "idx_performance", columnList = "performance_id"),
    @Index(name = "idx_judge", columnList = "judge_id")
})
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performance_id", nullable = false)
    private Performance performance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_id", nullable = false)
    private User judge;

    @Min(value = 0, message = "Pitch score must be between 0 and 100")
    @Max(value = 100, message = "Pitch score must be between 0 and 100")
    @Column(nullable = false)
    private Integer pitchScore;

    @Min(value = 0, message = "Rhythm score must be between 0 and 100")
    @Max(value = 100, message = "Rhythm score must be between 0 and 100")
    @Column(nullable = false)
    private Integer rhythmScore;

    @Min(value = 0, message = "Timing score must be between 0 and 100")
    @Max(value = 100, message = "Timing score must be between 0 and 100")
    @Column(nullable = false)
    private Integer timingScore;

    @Min(value = 0, message = "Technique score must be between 0 and 100")
    @Max(value = 100, message = "Technique score must be between 0 and 100")
    @Column(nullable = false)
    private Integer techniqueScore;

    @Min(value = 0, message = "Creativity score must be between 0 and 100")
    @Max(value = 100, message = "Creativity score must be between 0 and 100")
    @Column(nullable = false)
    private Integer creativityScore;

    @Min(value = 0, message = "Expression score must be between 0 and 100")
    @Max(value = 100, message = "Expression score must be between 0 and 100")
    @Column(nullable = false)
    private Integer expressionScore;

    @Min(value = 0, message = "Overall score must be between 0 and 100")
    @Max(value = 100, message = "Overall score must be between 0 and 100")
    @Column(nullable = false)
    private Integer overallScore;

    @NotBlank(message = "Feedback is required")
    @Column(nullable = false, length = 2000)
    private String feedback;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Evaluation() {}

    public Evaluation(Performance performance, User judge, Integer pitchScore, Integer rhythmScore,
                     Integer timingScore, Integer techniqueScore, Integer creativityScore,
                     Integer expressionScore, Integer overallScore, String feedback) {
        this.performance = performance;
        this.judge = judge;
        this.pitchScore = pitchScore;
        this.rhythmScore = rhythmScore;
        this.timingScore = timingScore;
        this.techniqueScore = techniqueScore;
        this.creativityScore = creativityScore;
        this.expressionScore = expressionScore;
        this.overallScore = overallScore;
        this.feedback = feedback;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Performance getPerformance() { return performance; }
    public void setPerformance(Performance performance) { this.performance = performance; }

    public User getJudge() { return judge; }
    public void setJudge(User judge) { this.judge = judge; }

    public Integer getPitchScore() { return pitchScore; }
    public void setPitchScore(Integer pitchScore) { this.pitchScore = pitchScore; }

    public Integer getRhythmScore() { return rhythmScore; }
    public void setRhythmScore(Integer rhythmScore) { this.rhythmScore = rhythmScore; }

    public Integer getTimingScore() { return timingScore; }
    public void setTimingScore(Integer timingScore) { this.timingScore = timingScore; }

    public Integer getTechniqueScore() { return techniqueScore; }
    public void setTechniqueScore(Integer techniqueScore) { this.techniqueScore = techniqueScore; }

    public Integer getCreativityScore() { return creativityScore; }
    public void setCreativityScore(Integer creativityScore) { this.creativityScore = creativityScore; }

    public Integer getExpressionScore() { return expressionScore; }
    public void setExpressionScore(Integer expressionScore) { this.expressionScore = expressionScore; }

    public Integer getOverallScore() { return overallScore; }
    public void setOverallScore(Integer overallScore) { this.overallScore = overallScore; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
