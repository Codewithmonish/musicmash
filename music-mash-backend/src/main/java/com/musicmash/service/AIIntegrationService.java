package com.musicmash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AIIntegrationService {

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AIIntegrationService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public AIAnalysisResponseDTO submitForAnalysis(AIAnalysisRequestDTO request) {
        try {
            String url = aiServiceUrl + "/api/ai/analyze";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<AIAnalysisRequestDTO> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<AIAnalysisResponseDTO> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                AIAnalysisResponseDTO.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Failed to submit analysis to AI service: " + e.getMessage(), e);
        }
    }

    public String getAnalysisStatus(Long analysisId) {
        try {
            String url = aiServiceUrl + "/api/ai/status/" + analysisId;
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get analysis status: " + e.getMessage(), e);
        }
    }

    public String getAnalysisResult(Long analysisId) {
        try {
            String url = aiServiceUrl + "/api/ai/result/" + analysisId;
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get analysis result: " + e.getMessage(), e);
        }
    }

    public String getPitchContour(Long analysisId) {
        try {
            String url = aiServiceUrl + "/api/ai/result/" + analysisId + "/pitch-contour";

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get pitch contour: " + e.getMessage(), e);
        }
    }
}
