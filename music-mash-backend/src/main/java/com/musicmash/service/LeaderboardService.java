package com.musicmash.service;

import com.musicmash.entity.Leaderboard;
import com.musicmash.entity.UserStats;
import com.musicmash.repository.LeaderboardRepository;
import com.musicmash.repository.UserStatsRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;
    private final UserStatsRepository userStatsRepository;

    public LeaderboardService(LeaderboardRepository leaderboardRepository, UserStatsRepository userStatsRepository) {
        this.leaderboardRepository = leaderboardRepository;
        this.userStatsRepository = userStatsRepository;
    }

    public List<Map<String, Object>> getGlobalLeaderboard() {
        List<UserStats> statsList = userStatsRepository.findAllByOrderByTotalXpDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        int rank = 1;
        for (UserStats stats : statsList) {
            Map<String, Object> map = new HashMap<>();
            map.put("rank", rank);
            map.put("userId", stats.getUser().getId());
            map.put("username", stats.getUser().getUsername());
            map.put("totalXp", stats.getTotalXp());
            map.put("level", stats.getLevel());
            map.put("streak", stats.getStreak());
            map.put("exercisesCompleted", stats.getExercisesCompleted());
            result.add(map);
            rank++;
        }

        return result;
    }

    public List<Leaderboard> getCompetitionLeaderboard(Long competitionId) {
        return leaderboardRepository.findByCompetitionIdOrderByTotalScoreDesc(competitionId);
    }
}
