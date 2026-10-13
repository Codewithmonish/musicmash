package com.musicmash.repository;

import com.musicmash.entity.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    Optional<Evaluation> findByPerformanceId(Long performanceId);

    boolean existsByPerformanceId(Long performanceId);
}
