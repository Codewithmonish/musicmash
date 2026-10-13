package com.musicmash.controller;

import com.musicmash.dto.PerformanceRequestDTO;
import com.musicmash.dto.PerformanceResponseDTO;
import com.musicmash.entity.Instrument;
import com.musicmash.entity.PerformanceCategory;
import com.musicmash.entity.DifficultyLevel;
import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.PerformanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/performances")
@CrossOrigin(origins = "*")
public class PerformanceController {

    private final PerformanceService performanceService;
    private final UserRepository userRepository;

    public PerformanceController(PerformanceService performanceService, UserRepository userRepository) {
        this.performanceService = performanceService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<PerformanceResponseDTO> createPerformance(
            @Valid @RequestBody PerformanceRequestDTO request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PerformanceResponseDTO response = performanceService.createPerformance(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PerformanceResponseDTO>> getMyPerformances(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<PerformanceResponseDTO> response = performanceService.getUserPerformances(user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PerformanceResponseDTO> getPerformanceById(@PathVariable Long id) {
        PerformanceResponseDTO response = performanceService.getPerformanceById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PerformanceResponseDTO> updatePerformance(
            @PathVariable Long id,
            @Valid @RequestBody PerformanceRequestDTO request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PerformanceResponseDTO response = performanceService.updatePerformance(id, user.getId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerformance(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        performanceService.deletePerformance(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<PerformanceResponseDTO> submitPerformance(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PerformanceResponseDTO response = performanceService.submitPerformance(id, user.getId());
        return ResponseEntity.ok(response);
    }
}
