package com.musicmash.controller;

import com.musicmash.entity.Leaderboard;
import com.musicmash.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "*")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getGlobalLeaderboard() {
        return ResponseEntity.ok(leaderboardService.getGlobalLeaderboard());
    }

    @GetMapping("/competition/{competitionId}")
    public ResponseEntity<List<Leaderboard>> getCompetitionLeaderboard(@PathVariable Long competitionId) {
        return ResponseEntity.ok(leaderboardService.getCompetitionLeaderboard(competitionId));
    }
}
