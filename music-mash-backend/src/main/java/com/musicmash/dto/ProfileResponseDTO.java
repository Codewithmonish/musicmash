package com.musicmash.dto;

import com.musicmash.entity.ExperienceLevel;
import com.musicmash.entity.Instrument;

import java.time.LocalDateTime;

public class ProfileResponseDTO {

    private Long id;
    private Long userId;
    private String username;
    private String displayName;
    private String bio;
    private String country;
    private ExperienceLevel experienceLevel;
    private Instrument primaryInstrument;
    private Instrument secondaryInstrument;
    private String musicGenres;
    private String profileImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProfileResponseDTO() {}

    public ProfileResponseDTO(Long id, Long userId, String username, String displayName, String bio, 
                             String country, ExperienceLevel experienceLevel, Instrument primaryInstrument, 
                             Instrument secondaryInstrument, String musicGenres, String profileImage,
                             LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.displayName = displayName;
        this.bio = bio;
        this.country = country;
        this.experienceLevel = experienceLevel;
        this.primaryInstrument = primaryInstrument;
        this.secondaryInstrument = secondaryInstrument;
        this.musicGenres = musicGenres;
        this.profileImage = profileImage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public ExperienceLevel getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(ExperienceLevel experienceLevel) { this.experienceLevel = experienceLevel; }

    public Instrument getPrimaryInstrument() { return primaryInstrument; }
    public void setPrimaryInstrument(Instrument primaryInstrument) { this.primaryInstrument = primaryInstrument; }

    public Instrument getSecondaryInstrument() { return secondaryInstrument; }
    public void setSecondaryInstrument(Instrument secondaryInstrument) { this.secondaryInstrument = secondaryInstrument; }

    public String getMusicGenres() { return musicGenres; }
    public void setMusicGenres(String musicGenres) { this.musicGenres = musicGenres; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
