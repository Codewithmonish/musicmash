package com.musicmash.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class EvaluationRequestDTO {

    @Min(value = 0, message = "Pitch score must be between 0 and 100")
    @Max(value = 100, message = "Pitch score must be between 0 and 100")
    private Integer pitchScore;

    @Min(value = 0, message = "Rhythm score must be between 0 and 100")
    @Max(value = 100, message = "Rhythm score must be between 0 and 100")
    private Integer rhythmScore;

    @Min(value = 0, message = "Timing score must be between 0 and 100")
    @Max(value = 100, message = "Timing score must be between 0 and 100")
    private Integer timingScore;

    @Min(value = 0, message = "Technique score must be between 0 and 100")
    @Max(value = 100, message = "Technique score must be between 0 and 100")
    private Integer techniqueScore;

    @Min(value = 0, message = "Creativity score must be between 0 and 100")
    @Max(value = 100, message = "Creativity score must be between 0 and 100")
    private Integer creativityScore;

    @Min(value = 0, message = "Expression score must be between 0 and 100")
    @Max(value = 100, message = "Expression score must be between 0 and 100")
    private Integer expressionScore;

    @NotBlank(message = "Feedback is required")
    private String feedback;

    public EvaluationRequestDTO() {}

    public EvaluationRequestDTO(Integer pitchScore, Integer rhythmScore, Integer timingScore,
                               Integer techniqueScore, Integer creativityScore,
                               Integer expressionScore, String feedback) {
        this.pitchScore = pitchScore;
        this.rhythmScore = rhythmScore;
        this.timingScore = timingScore;
        this.techniqueScore = techniqueScore;
        this.creativityScore = creativityScore;
        this.expressionScore = expressionScore;
        this.feedback = feedback;
    }

    // Getters and Setters
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

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }
}
