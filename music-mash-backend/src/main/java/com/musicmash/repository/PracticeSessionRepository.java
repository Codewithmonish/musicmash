package com.musicmash.repository;

import com.musicmash.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PracticeSessionRepository extends JpaRepository<PracticeSession, Long> {
    List<PracticeSession> findByUserIdOrderByCompletedAtDesc(Long userId);
    List<PracticeSession> findTop10ByUserIdOrderByCompletedAtDesc(Long userId);
    List<PracticeSession> findByUserIdAndCompletedAtAfterOrderByCompletedAtAsc(Long userId, java.time.LocalDateTime after);
}
