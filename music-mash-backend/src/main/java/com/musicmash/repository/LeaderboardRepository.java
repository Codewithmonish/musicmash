package com.musicmash.repository;

import com.musicmash.entity.Leaderboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaderboardRepository extends JpaRepository<Leaderboard, Long> {
    List<Leaderboard> findByCompetitionIdOrderByTotalScoreDesc(Long competitionId);
    Optional<Leaderboard> findByUserIdAndCompetitionId(Long userId, Long competitionId);

    @Query("SELECT l FROM Leaderboard l WHERE l.competition IS NULL ORDER BY l.totalScore DESC")
    List<Leaderboard> findGlobalLeaderboard();

    Optional<Leaderboard> findByUserIdAndCompetitionIsNull(Long userId);
}
