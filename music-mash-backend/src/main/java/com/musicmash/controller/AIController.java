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
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Set user ID from authenticated user
            request.setUserId(user.getId());
            
            AIAnalysisResponseDTO response = aiIntegrationService.submitForAnalysis(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to submit analysis: " + e.getMessage());
        }
    }

    @GetMapping("/status/{analysisId}")
    public ResponseEntity<String> getAnalysisStatus(@PathVariable Long analysisId) {
        try {
            String response = aiIntegrationService.getAnalysisStatus(analysisId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get analysis status: " + e.getMessage());
        }
    }

    @GetMapping("/result/{analysisId}")
    public ResponseEntity<String> getAnalysisResult(@PathVariable Long analysisId) {
        try {
            String response = aiIntegrationService.getAnalysisResult(analysisId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get analysis result: " + e.getMessage());
        }
    }
}
