package com.musicmash.repository;

import com.musicmash.entity.Performance;
import com.musicmash.entity.PerformanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerformanceRepository extends JpaRepository<Performance, Long> {

    List<Performance> findByUserIdOrderBySubmittedAtDesc(Long userId);

    List<Performance> findByStatusOrderBySubmittedAtDesc(PerformanceStatus status);

    List<Performance> findByUserIdAndStatusOrderBySubmittedAtDesc(Long userId, PerformanceStatus status);

    /** Newest performances with the given status; q (lower-case) matches title or username. */
    @Query("SELECT p FROM Performance p JOIN FETCH p.user u WHERE p.status = :status " +
           "AND (:q IS NULL OR LOWER(p.title) LIKE CONCAT('%', :q, '%') OR LOWER(u.username) LIKE CONCAT('%', :q, '%')) " +
           "ORDER BY p.submittedAt DESC")
    List<Performance> findLatestPublic(@Param("status") PerformanceStatus status, @Param("q") String q,
                                       org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Performance p WHERE p.status = :status " +
           "AND (:instrument IS NULL OR p.instrument = :instrument) " +
           "AND (:category IS NULL OR p.category = :category) " +
           "AND (:difficulty IS NULL OR p.difficulty = :difficulty) " +
           "ORDER BY p.submittedAt DESC")
    List<Performance> findSubmittedPerformancesWithFilters(
            @Param("status") PerformanceStatus status,
            @Param("instrument") com.musicmash.entity.Instrument instrument,
            @Param("category") com.musicmash.entity.PerformanceCategory category,
            @Param("difficulty") com.musicmash.entity.DifficultyLevel difficulty
    );
}
