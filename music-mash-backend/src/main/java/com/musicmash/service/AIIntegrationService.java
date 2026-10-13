package com.musicmash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
import com.musicmash.dto.AIServiceAnalyzeRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Talks to the Python AI service.
 *
 * The AI service's API is snake_case, while Spring's own DTOs (shared with the frontend) are
 * camelCase. The translation happens here and only here: this RestTemplate uses its own
 * snake_case ObjectMapper, so the rest of the app never sees snake_case. The exact wire format
 * is pinned by contracts/ai-analyze-*.json and AIServiceContractTest.
 */
@Service
public class AIIntegrationService {

    /** Prefix of the references FileStorageService returns, e.g. "/uploads/3f2a....wav". */
    static final String UPLOAD_PREFIX = "/uploads/";
    private static final Pattern PLAIN_FILE_NAME = Pattern.compile("^[A-Za-z0-9_-][A-Za-z0-9._-]{0,254}$");

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;      // JSON in snake_case, for /analyze
    private final RestTemplate rawRestTemplate;   // bodies passed through as strings

    public AIIntegrationService() {
        MappingJackson2HttpMessageConverter snakeCaseJson = new MappingJackson2HttpMessageConverter(aiObjectMapper());
        this.restTemplate = new RestTemplate(List.of(snakeCaseJson));
        this.rawRestTemplate = new RestTemplate();
    }

    /** snake_case JSON with java.time support, matching the AI service's API. */
    public static ObjectMapper aiObjectMapper() {
        return Jackson2ObjectMapperBuilder.json()
                .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .build();
    }

    /**
     * Turn an upload reference returned by /api/upload ("/uploads/name.wav") into the plain
     * file name the AI service expects ("name.wav"). Null stays null. Anything else (an
     * external URL, a path with directories) is rejected.
     */
    public static String toUploadFileName(String uploadReference) {
        if (uploadReference == null || uploadReference.isBlank()) {
            return null;
        }
        if (!uploadReference.startsWith(UPLOAD_PREFIX)) {
            throw new IllegalArgumentException("Media must be a file uploaded through /api/upload (expected /uploads/<file>)");
        }
        String fileName = uploadReference.substring(UPLOAD_PREFIX.length());
        if (!PLAIN_FILE_NAME.matcher(fileName).matches() || fileName.contains("..")) {
            throw new IllegalArgumentException("Invalid upload file name: " + fileName);
        }
        return fileName;
    }

    public static AIServiceAnalyzeRequest toAIServiceRequest(AIAnalysisRequestDTO request) {
        String audioFile = toUploadFileName(request.getAudioUrl());
        String videoFile = toUploadFileName(request.getVideoUrl());
        if (audioFile == null && videoFile == null) {
            throw new IllegalArgumentException("audioUrl or videoUrl is required");
        }
        return new AIServiceAnalyzeRequest(
                request.getPerformanceId(),
                request.getUserId(),
                audioFile,
                videoFile,
                request.getInstrument(),
                request.getCategory()
        );
    }

    public AIAnalysisResponseDTO submitForAnalysis(AIAnalysisRequestDTO request) {
        AIServiceAnalyzeRequest body = toAIServiceRequest(request);
        try {
            String url = aiServiceUrl + "/api/ai/analyze";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<AIServiceAnalyzeRequest> entity = new HttpEntity<>(body, headers);

            ResponseEntity<AIAnalysisResponseDTO> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                AIAnalysisResponseDTO.class
            );

            return response.getBody();
        } catch (HttpStatusCodeException e) {
            // Keep the AI service's status and message (e.g. 400 "file not found").
            throw new ResponseStatusException(e.getStatusCode(), e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to submit analysis to AI service: " + e.getMessage(), e);
        }
    }

    public ResponseEntity<String> getAnalysisStatus(Long analysisId) {
        return getRaw("/api/ai/status/" + analysisId);
    }

    public ResponseEntity<String> getAnalysisResult(Long analysisId) {
        return getRaw("/api/ai/result/" + analysisId);
    }

    public ResponseEntity<String> getPitchContour(Long analysisId) {
        return getRaw("/api/ai/result/" + analysisId + "/pitch-contour");
    }

    /**
     * Pass-through GET: the AI service's JSON body AND status code reach the frontend
     * unchanged, so e.g. 400 {"detail": "Analysis not completed yet"} is not turned into 500.
     */
    private ResponseEntity<String> getRaw(String path) {
        try {
            ResponseEntity<String> response = rawRestTemplate.getForEntity(aiServiceUrl + path, String.class);
            return ResponseEntity.status(response.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI service unavailable: " + e.getMessage(), e);
        }
    }
}
