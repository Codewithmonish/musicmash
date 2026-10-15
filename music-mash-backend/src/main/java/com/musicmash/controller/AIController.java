package com.musicmash.controller;

import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
import com.musicmash.dto.CompareRequestDTO;
import com.musicmash.dto.ReferenceUploadRequestDTO;
import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.AIIntegrationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    private final AIIntegrationService aiIntegrationService;
    private final UserRepository userRepository;

    public AIController(AIIntegrationService aiIntegrationService, UserRepository userRepository) {
        this.aiIntegrationService = aiIntegrationService;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<AIAnalysisResponseDTO> submitAnalysis(
            @RequestBody AIAnalysisRequestDTO request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // Set user ID from authenticated user
        request.setUserId(user.getId());

        try {
            AIAnalysisResponseDTO response = aiIntegrationService.submitForAnalysis(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }
    }

    @GetMapping("/status/{analysisId}")
    public ResponseEntity<String> getAnalysisStatus(@PathVariable Long analysisId) {
        return aiIntegrationService.getAnalysisStatus(analysisId);
    }

    @GetMapping("/result/{analysisId}")
    public ResponseEntity<String> getAnalysisResult(@PathVariable Long analysisId) {
        return aiIntegrationService.getAnalysisResult(analysisId);
    }

    @GetMapping("/result/{analysisId}/pitch-contour")
    public ResponseEntity<String> getPitchContour(@PathVariable Long analysisId) {
        return aiIntegrationService.getPitchContour(analysisId);
    }

    // --- Reference tracks and comparisons (Phase 3) ------------------------------------

    @PostMapping("/references")
    public ResponseEntity<String> createReference(@RequestBody ReferenceUploadRequestDTO request,
                                                  Authentication authentication) {
        boolean canUpload = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HOST") || a.getAuthority().equals("ROLE_ADMIN"));
        if (!canUpload) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only hosts and admins can add reference tracks");
        }
        try {
            return aiIntegrationService.createReference(request, currentUser(authentication).getId());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }
    }

    @GetMapping("/references")
    public ResponseEntity<String> listReferences() {
        return aiIntegrationService.listReferences();
    }

    @GetMapping("/references/{referenceId}")
    public ResponseEntity<String> getReference(@PathVariable Long referenceId) {
        return aiIntegrationService.getReference(referenceId);
    }

    @PostMapping("/compare")
    public ResponseEntity<String> compare(@RequestBody CompareRequestDTO request, Authentication authentication) {
        try {
            return aiIntegrationService.compare(request, currentUser(authentication).getId());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        }
    }

    @GetMapping("/compare/{comparisonId}/status")
    public ResponseEntity<String> getComparisonStatus(@PathVariable Long comparisonId) {
        return aiIntegrationService.getComparisonStatus(comparisonId);
    }

    @GetMapping("/compare/{comparisonId}/result")
    public ResponseEntity<String> getComparisonResult(@PathVariable Long comparisonId) {
        return aiIntegrationService.getComparisonResult(comparisonId);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
