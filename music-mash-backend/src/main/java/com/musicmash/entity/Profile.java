package com.musicmash.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "profiles", indexes = {
    @Index(name = "idx_user", columnList = "user_id"),
    @Index(name = "idx_display_name", columnList = "display_name")
})
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 50, message = "Display name must be between 2 and 50 characters")
    @Column(nullable = false, length = 50)
    private String displayName;

    @Size(max = 500, message = "Bio must not exceed 500 characters")
    @Column(length = 500)
    private String bio;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    @Column(length = 100)
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ExperienceLevel experienceLevel;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Instrument primaryInstrument;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Instrument secondaryInstrument;

    @Column(length = 255)
    private String musicGenres;

    @Column(length = 255)
    private String profileImage;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Profile() {}

    public Profile(User user, String displayName, String bio, String country, 
                   ExperienceLevel experienceLevel, Instrument primaryInstrument, 
                   Instrument secondaryInstrument, String musicGenres, String profileImage) {
        this.user = user;
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
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

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
