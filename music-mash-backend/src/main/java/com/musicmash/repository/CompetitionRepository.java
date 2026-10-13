package com.musicmash.repository;

import com.musicmash.entity.Competition;
import com.musicmash.entity.CompetitionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetitionRepository extends JpaRepository<Competition, Long> {
    List<Competition> findByStatus(CompetitionStatus status);
    List<Competition> findByCategory(String category);
    List<Competition> findByInstrument(String instrument);
}
