package com.musicmash.repository;

import com.musicmash.entity.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
    List<Challenge> findByStatus(String status);
    List<Challenge> findByCompetitionId(Long competitionId);
}
