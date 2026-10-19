package com.musicmash.config;

import com.musicmash.entity.Exercise;
import com.musicmash.repository.ExerciseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the Practice Arena exercise library once (only when the table is empty).
 * Tempos and attempt lengths are ordinary teaching values for each exercise.
 */
@Component
public class ExerciseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ExerciseSeeder.class);
    private final ExerciseRepository exerciseRepository;

    public ExerciseSeeder(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    static List<Exercise> library() {
        String img = "/images/instruments/";
        return List.of(
            new Exercise("Metronome lock-in", "Play one note on every click for 30 seconds. Pure timing: land exactly on the beat.",
                    "ANY", "BEGINNER", 60, "4/4", 30, 80, "rhythm", "TIMING", "/images/covers/drums-spot.webp"),
            new Exercise("C major scale, two octaves", "Up and down two octaves, one note per beat. Even tone, centred pitch.",
                    "PIANO", "BEGINNER", 80, "4/4", 30, 100, "scales", "BOTH", img + "piano.webp"),
            new Exercise("Hanon No. 1", "The first Hanon finger exercise, sixteenth notes, hands together. Even, steady fingers.",
                    "PIANO", "INTERMEDIATE", 108, "4/4", 45, 160, "technique", "TIMING", "/images/covers/piano-mono.webp"),
            new Exercise("Waltz arpeggios", "Broken triads in 3/4, accent on beat one. Keep the waltz pulse steady.",
                    "PIANO", "ADVANCED", 132, "3/4", 45, 200, "arpeggios", "TIMING", img + "piano.webp"),
            new Exercise("A minor pentatonic, box 1", "Up and down the first position, alternate picking, one note per beat.",
                    "GUITAR", "BEGINNER", 90, "4/4", 30, 100, "scales", "BOTH", img + "guitar.webp"),
            new Exercise("A blues scale with bends", "Eighth notes through the blues scale; aim every bend at the target pitch.",
                    "GUITAR", "INTERMEDIATE", 110, "4/4", 40, 150, "scales", "INTONATION", "/images/covers/guitar-mono.webp"),
            new Exercise("Long tones against a drone", "Hold each note of a D major scale for four beats. Keep the pitch dead centre.",
                    "VIOLIN", "BEGINNER", 60, "4/4", 45, 120, "tone", "INTONATION", img + "violin.webp"),
            new Exercise("Three-octave G major", "Slurred, two notes per bow. Shifts in tune, no slides.",
                    "VIOLIN", "ADVANCED", 72, "4/4", 60, 220, "scales", "INTONATION", "/images/covers/violin-dark.webp"),
            new Exercise("Sirens and sustained vowels", "Slide up and down an octave, then hold 'ah' on five notes of the scale.",
                    "VOCALS", "BEGINNER", 70, "4/4", 30, 100, "tone", "INTONATION", img + "vocals.webp"),
            new Exercise("Major scale on 'la'", "Sing a major scale up and down on 'la', one note per beat.",
                    "VOCALS", "INTERMEDIATE", 90, "4/4", 35, 140, "scales", "BOTH", "/images/covers/mic-violet.webp"),
            new Exercise("Eighth-note groove", "Hi-hat eighths, kick on 1 and 3, snare on 2 and 4.",
                    "DRUMS", "BEGINNER", 90, "4/4", 30, 100, "rhythm", "TIMING", img + "drums.webp"),
            new Exercise("Sixteenth-note subdivision", "Single strokes in sixteenths on the snare, accent every beat.",
                    "DRUMS", "INTERMEDIATE", 100, "4/4", 40, 150, "rhythm", "TIMING", "/images/covers/drums-spot.webp"),
            new Exercise("Root–fifth bass line", "Root on beat 1, fifth on beat 3, through C, F and G.",
                    "BASS", "BEGINNER", 85, "4/4", 30, 100, "rhythm", "TIMING", img + "bass.webp"),
            new Exercise("Chromatic octave", "One octave chromatic scale, up and down, slurred.",
                    "FLUTE", "INTERMEDIATE", 92, "4/4", 35, 140, "scales", "BOTH", img + "flute.webp"),
            new Exercise("Major scale in thirds", "B-flat major in broken thirds, tongued, even eighth notes.",
                    "SAXOPHONE", "ADVANCED", 120, "4/4", 50, 220, "scales", "BOTH", img + "saxophone.webp"),
            new Exercise("Lip slurs", "Slur between harmonics on open valves: C, G, C and back. Centre every partial.",
                    "TRUMPET", "INTERMEDIATE", 72, "4/4", 40, 150, "tone", "INTONATION", img + "trumpet.webp"),
            new Exercise("Open-string bowing", "Whole bows on each open string, four beats each, steady sound.",
                    "CELLO", "BEGINNER", 60, "4/4", 40, 100, "tone", "BOTH", img + "cello.webp")
        );
    }

    @Override
    public void run(String... args) {
        if (exerciseRepository.count() > 0) {
            return;
        }
        List<Exercise> exercises = library();
        exerciseRepository.saveAll(exercises);
        log.info("Seeded {} practice exercises", exercises.size());
    }
}
