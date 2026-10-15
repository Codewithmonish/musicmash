package com.musicmash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.musicmash.config.ExerciseSeederAccess;
import com.musicmash.entity.Exercise;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Real scoring rules for practice sessions, and the seeded exercise library. */
class PracticeServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void scoresAreReadFromTheAnalysisResult() throws Exception {
        String result = """
                {"analysis": {"status": "COMPLETED"},
                 "skill_prediction": {"intonation_score": 80.4, "rhythm_score": null, "overall_score": 80.4}}""";
        PracticeService.MeasuredScores scores = PracticeService.parseScores(mapper.readTree(result));
        assertEquals(80.4, scores.intonation());
        assertNull(scores.rhythm());
        assertEquals(80.4, scores.overall());
    }

    @Test
    void missingSkillPredictionMeansNoScores() throws Exception {
        PracticeService.MeasuredScores scores = PracticeService.parseScores(mapper.readTree("{}"));
        assertNull(scores.intonation());
        assertNull(scores.overall());
    }

    @Test
    void xpIsTheRewardScaledByTheMeasuredOverallScore() {
        assertEquals(150, PracticeService.xpFor(150, 100.0));
        assertEquals(121, PracticeService.xpFor(150, 80.4));
        assertEquals(0, PracticeService.xpFor(150, 0.0));
        assertEquals(0, PracticeService.xpFor(150, null));   // nothing measurable, no XP
        assertEquals(150, PracticeService.xpFor(150, 130.0)); // clamped
    }

    @Test
    void seededExercisesHaveRealisticMetadataAndExistingCovers() {
        List<Exercise> library = ExerciseSeederAccess.library();
        assertTrue(library.size() >= 15);
        Set<String> levels = Set.of("BEGINNER", "INTERMEDIATE", "ADVANCED");
        Set<String> focuses = Set.of("INTONATION", "TIMING", "BOTH");
        for (Exercise e : library) {
            assertTrue(e.getBpm() >= 40 && e.getBpm() <= 220, e.getTitle() + " bpm");
            assertTrue(e.getTimeSignature().matches("[2-7]/[48]"), e.getTitle() + " time signature");
            assertTrue(e.getDurationSeconds() >= 20 && e.getDurationSeconds() <= 90, e.getTitle() + " duration");
            assertTrue(levels.contains(e.getDifficulty()), e.getTitle() + " difficulty");
            assertTrue(focuses.contains(e.getFocus()), e.getTitle() + " focus");
            Path cover = Path.of("..", "music-mash-frontend", "public").resolve(e.getCoverImage().substring(1));
            assertTrue(Files.exists(cover), e.getTitle() + " cover " + cover);
        }
    }
}
