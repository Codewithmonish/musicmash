package com.musicmash.dto;

import com.musicmash.entity.ExperienceLevel;
import com.musicmash.entity.Instrument;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ProfileRequestDTO {

    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 50, message = "Display name must be between 2 and 50 characters")
    private String displayName;

    @Size(max = 500, message = "Bio must not exceed 500 characters")
    private String bio;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;

    private ExperienceLevel experienceLevel;

    private Instrument primaryInstrument;

    private Instrument secondaryInstrument;

    private String musicGenres;

    private String profileImage;

    public ProfileRequestDTO() {}

    public ProfileRequestDTO(String displayName, String bio, String country, 
                            ExperienceLevel experienceLevel, Instrument primaryInstrument, 
                            Instrument secondaryInstrument, String musicGenres, String profileImage) {
        this.displayName = displayName;
        this.bio = bio;
        this.country = country;
        this.experienceLevel = experienceLevel;
        this.primaryInstrument = primaryInstrument;
        this.secondaryInstrument = secondaryInstrument;
        this.musicGenres = musicGenres;
        this.profileImage = profileImage;
    }

    // Getters and Setters
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
}
