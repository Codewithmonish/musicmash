package com.musicmash.controller;

import com.musicmash.dto.PublicPerformanceDTO;
import com.musicmash.entity.PerformanceStatus;
import com.musicmash.repository.PerformanceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints that need no login (permitted under /api/public/** in SecurityConfig). */
@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
public class PublicController {

    private static final int MAX_LIMIT = 24;
    private final PerformanceRepository performanceRepository;

    public PublicController(PerformanceRepository performanceRepository) {
        this.performanceRepository = performanceRepository;
    }

    /** Latest APPROVED performances, newest first; optional q filters by title or username. */
    @GetMapping("/performances/latest")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PublicPerformanceDTO>> latestPerformances(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(required = false) String q) {
        String query = (q == null || q.isBlank()) ? null : q.trim().toLowerCase();
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        List<PublicPerformanceDTO> performances = performanceRepository
                .findLatestPublic(PerformanceStatus.APPROVED, query, PageRequest.of(0, size))
                .stream()
                .map(PublicPerformanceDTO::from)
                .toList();
        return ResponseEntity.ok(performances);
    }
}
