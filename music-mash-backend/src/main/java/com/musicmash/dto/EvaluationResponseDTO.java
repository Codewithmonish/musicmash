package com.musicmash.dto;

import java.time.LocalDateTime;

public class EvaluationResponseDTO {

    private Long id;
    private Long performanceId;
    private String performanceTitle;
    private Long judgeId;
    private String judgeName;
    private Integer pitchScore;
    private Integer rhythmScore;
    private Integer timingScore;
    private Integer techniqueScore;
    private Integer creativityScore;
    private Integer expressionScore;
    private Integer overallScore;
    private String feedback;
    private LocalDateTime createdAt;

    public EvaluationResponseDTO() {}

    public EvaluationResponseDTO(Long id, Long performanceId, String performanceTitle, Long judgeId,
                                  String judgeName, Integer pitchScore, Integer rhythmScore,
                                  Integer timingScore, Integer techniqueScore, Integer creativityScore,
                                  Integer expressionScore, Integer overallScore, String feedback,
                                  LocalDateTime createdAt) {
        this.id = id;
        this.performanceId = performanceId;
        this.performanceTitle = performanceTitle;
        this.judgeId = judgeId;
        this.judgeName = judgeName;
        this.pitchScore = pitchScore;
        this.rhythmScore = rhythmScore;
        this.timingScore = timingScore;
        this.techniqueScore = techniqueScore;
        this.creativityScore = creativityScore;
        this.expressionScore = expressionScore;
        this.overallScore = overallScore;
        this.feedback = feedback;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPerformanceId() { return performanceId; }
    public void setPerformanceId(Long performanceId) { this.performanceId = performanceId; }

    public String getPerformanceTitle() { return performanceTitle; }
    public void setPerformanceTitle(String performanceTitle) { this.performanceTitle = performanceTitle; }

    public Long getJudgeId() { return judgeId; }
    public void setJudgeId(Long judgeId) { this.judgeId = judgeId; }

    public String getJudgeName() { return judgeName; }
    public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

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
