package com.musicmash.dto;

import com.musicmash.entity.DifficultyLevel;
import com.musicmash.entity.Instrument;
import com.musicmash.entity.PerformanceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PerformanceRequestDTO {

    @NotBlank(message = "Title is required")
    @Size(max = 100, message = "Title must not exceed 100 characters")
    private String title;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private PerformanceCategory category;

    private Instrument instrument;

    private DifficultyLevel difficulty;

    private String audioUrl;

    private String videoUrl;

    private String thumbnailUrl;

    public PerformanceRequestDTO() {}

    public PerformanceRequestDTO(String title, String description, PerformanceCategory category,
                                 Instrument instrument, DifficultyLevel difficulty, String audioUrl,
                                 String videoUrl, String thumbnailUrl) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.instrument = instrument;
        this.difficulty = difficulty;
        this.audioUrl = audioUrl;
        this.videoUrl = videoUrl;
        this.thumbnailUrl = thumbnailUrl;
    }

    // Getters and Setters
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
}
