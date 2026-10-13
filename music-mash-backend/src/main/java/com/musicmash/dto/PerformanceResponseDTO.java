package com.musicmash.dto;

import com.musicmash.entity.DifficultyLevel;
import com.musicmash.entity.Instrument;
import com.musicmash.entity.PerformanceCategory;
import com.musicmash.entity.PerformanceStatus;

import java.time.LocalDateTime;

public class PerformanceResponseDTO {

    private Long id;
    private Long userId;
    private String username;
    private String title;
    private String description;
    private PerformanceCategory category;
    private Instrument instrument;
    private DifficultyLevel difficulty;
    private String audioUrl;
    private String videoUrl;
    private String thumbnailUrl;
    private PerformanceStatus status;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;

    public PerformanceResponseDTO() {}

    public PerformanceResponseDTO(Long id, Long userId, String username, String title, String description,
                                  PerformanceCategory category, Instrument instrument, DifficultyLevel difficulty,
                                  String audioUrl, String videoUrl, String thumbnailUrl, PerformanceStatus status,
                                  LocalDateTime submittedAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.title = title;
        this.description = description;
        this.category = category;
        this.instrument = instrument;
        this.difficulty = difficulty;
        this.audioUrl = audioUrl;
        this.videoUrl = videoUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.status = status;
        this.submittedAt = submittedAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public PerformanceCategory getCategory() { return category; }
    public void setCategory(PerformanceCategory category) { this.category = category; }

    public Instrument getInstrument() { return instrument; }
    public void setInstrument(Instrument instrument) { this.instrument = instrument; }

    public DifficultyLevel getDifficulty() { return difficulty; }
    public void setDifficulty(DifficultyLevel difficulty) { this.difficulty = difficulty; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public PerformanceStatus getStatus() { return status; }
    public void setStatus(PerformanceStatus status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
