package com.musicmash.entity;

import jakarta.persistence.*;

/**
 * A practice exercise in the Practice Arena library (seeded by ExerciseSeeder).
 * The XP a session earns is xpReward scaled by the session's measured overall score.
 */
@Entity
@Table(name = "exercises")
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 500)
    private String description;

    /** Instrument enum name (e.g. PIANO), or ANY for exercises every instrument can play. */
    @Column(nullable = false)
    private String instrument;

    @Column(nullable = false)
    private String difficulty;         // BEGINNER / INTERMEDIATE / ADVANCED

    @Column(nullable = false)
    private Integer bpm;

    @Column(name = "time_signature", nullable = false)
    private String timeSignature;      // e.g. "4/4", "3/4"

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;   // length of one recorded attempt

    @Column(name = "xp_reward", nullable = false)
    private Integer xpReward;          // XP for a perfect (100/100) attempt

    private String category;           // scales, arpeggios, rhythm, tone...

    /** What the exercise trains, which decides the headline score: INTONATION, TIMING or BOTH. */
    private String focus;

    @Column(name = "cover_image")
    private String coverImage;         // frontend image path, e.g. /images/instruments/piano.webp

    public Exercise() {}

    public Exercise(String title, String description, String instrument, String difficulty, int bpm,
                    String timeSignature, int durationSeconds, int xpReward, String category, String focus,
                    String coverImage) {
        this.title = title;
        this.description = description;
        this.instrument = instrument;
        this.difficulty = difficulty;
        this.bpm = bpm;
        this.timeSignature = timeSignature;
        this.durationSeconds = durationSeconds;
        this.xpReward = xpReward;
        this.category = category;
        this.focus = focus;
        this.coverImage = coverImage;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getInstrument() { return instrument; }
    public String getDifficulty() { return difficulty; }
    public Integer getBpm() { return bpm; }
    public String getTimeSignature() { return timeSignature; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public Integer getXpReward() { return xpReward; }
    public String getCategory() { return category; }
    public String getFocus() { return focus; }
    public String getCoverImage() { return coverImage; }
}
