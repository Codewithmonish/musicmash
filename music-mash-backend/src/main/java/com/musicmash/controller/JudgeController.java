package com.musicmash.controller;

import com.musicmash.dto.EvaluationRequestDTO;
import com.musicmash.dto.EvaluationResponseDTO;
import com.musicmash.dto.PerformanceResponseDTO;
import com.musicmash.entity.Instrument;
import com.musicmash.entity.PerformanceCategory;
import com.musicmash.entity.DifficultyLevel;
import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.EvaluationService;
import com.musicmash.service.PerformanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/judge")
@CrossOrigin(origins = "*")
public class JudgeController {

    private final EvaluationService evaluationService;
    private final PerformanceService performanceService;
    private final UserRepository userRepository;

    public JudgeController(EvaluationService evaluationService, PerformanceService performanceService, 
                         UserRepository userRepository) {
        this.evaluationService = evaluationService;
        this.performanceService = performanceService;
        this.userRepository = userRepository;
    }

    @GetMapping("/performances")
    public ResponseEntity<List<PerformanceResponseDTO>> getSubmittedPerformances(
            @RequestParam(required = false) Instrument instrument,
            @RequestParam(required = false) PerformanceCategory category,
            @RequestParam(required = false) DifficultyLevel difficulty) {
        List<PerformanceResponseDTO> performances = performanceService.getSubmittedPerformances(
                instrument, category, difficulty);
        return ResponseEntity.ok(performances);
    }

    @PostMapping("/evaluations")
    public ResponseEntity<EvaluationResponseDTO> createEvaluation(
            @RequestParam Long performanceId,
            @Valid @RequestBody EvaluationRequestDTO request,
            Authentication authentication) {
        String email = authentication.getName();
        User judge = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Judge not found"));
        EvaluationResponseDTO response = evaluationService.createEvaluation(performanceId, judge.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/evaluations/{id}")
    public ResponseEntity<EvaluationResponseDTO> getEvaluationById(@PathVariable Long id) {
        EvaluationResponseDTO response = evaluationService.getEvaluationById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/evaluations/performance/{performanceId}")
    public ResponseEntity<EvaluationResponseDTO> getEvaluationByPerformanceId(@PathVariable Long performanceId) {
        EvaluationResponseDTO response = evaluationService.getEvaluationByPerformanceId(performanceId);
        return ResponseEntity.ok(response);
    }
}
