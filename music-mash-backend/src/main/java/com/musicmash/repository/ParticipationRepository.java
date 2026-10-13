package com.musicmash.repository;

import com.musicmash.entity.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipationRepository extends JpaRepository<Participation, Long> {
    List<Participation> findByCompetitionId(Long competitionId);
    List<Participation> findByUserId(Long userId);
    Optional<Participation> findByCompetitionIdAndUserId(Long competitionId, Long userId);
    boolean existsByCompetitionIdAndUserId(Long competitionId, Long userId);
}
