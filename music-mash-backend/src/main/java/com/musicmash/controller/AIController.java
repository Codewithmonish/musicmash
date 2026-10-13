package com.musicmash.controller;

import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
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
}
