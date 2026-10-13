package com.musicmash.dto;

public class AIAnalysisRequestDTO {
    private Long performanceId;
    private Long userId;
    private String audioUrl;
    private String videoUrl;
    private String instrument;
    private String category;

    public AIAnalysisRequestDTO() {}

    public AIAnalysisRequestDTO(Long performanceId, Long userId, String audioUrl, String videoUrl, String instrument, String category) {
        this.performanceId = performanceId;
        this.userId = userId;
        this.audioUrl = audioUrl;
        this.videoUrl = videoUrl;
        this.instrument = instrument;
        this.category = category;
    }

    // Getters and Setters
    public Long getPerformanceId() { return performanceId; }
    public void setPerformanceId(Long performanceId) { this.performanceId = performanceId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getInstrument() { return instrument; }
    public void setInstrument(String instrument) { this.instrument = instrument; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
