package com.musicmash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
import com.musicmash.dto.AIServiceAnalyzeRequest;
import com.musicmash.dto.AIServiceCoachRequest;
import com.musicmash.dto.AIServiceCompareRequest;
import com.musicmash.dto.AIServiceReferenceRequest;
import com.musicmash.dto.CompareRequestDTO;
import com.musicmash.dto.ReferenceUploadRequestDTO;
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
    /** Carries the authenticated user's id on every call to the AI service. */
    public static final String USER_HEADER = "X-User-Id";
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

    public ResponseEntity<String> getAnalysisStatus(Long analysisId, Long userId) {
        return getRaw("/api/ai/status/" + analysisId, userId);
    }

    public ResponseEntity<String> getAnalysisResult(Long analysisId, Long userId) {
        return getRaw("/api/ai/result/" + analysisId, userId);
    }

    public ResponseEntity<String> getPitchContour(Long analysisId, Long userId) {
        return getRaw("/api/ai/result/" + analysisId + "/pitch-contour", userId);
    }

    // --- Reference tracks and comparisons (Phase 3) ------------------------------------

    public ResponseEntity<String> createReference(ReferenceUploadRequestDTO request, Long userId) {
        AIServiceReferenceRequest body = new AIServiceReferenceRequest(
                request.getTitle(), request.getArtist(), request.getInstrument(),
                requireUploadFileName(request.getAudioUrl(), "audioUrl"), userId);
        return exchangeRaw(HttpMethod.POST, "/api/ai/references", body, userId);
    }

    public ResponseEntity<String> listReferences() {
        return getRaw("/api/ai/references", null);
    }

    public ResponseEntity<String> getReference(Long referenceId) {
        return getRaw("/api/ai/references/" + referenceId, null);
    }

    public static AIServiceCompareRequest toAIServiceCompareRequest(CompareRequestDTO request, Long userId) {
        String audioFile = toUploadFileName(request.getPerformanceAudioUrl());
        if ((audioFile == null) == (request.getAnalysisId() == null)) {
            throw new IllegalArgumentException("Give exactly one of performanceAudioUrl or analysisId");
        }
        return new AIServiceCompareRequest(userId, request.getReferenceId(), audioFile, request.getAnalysisId());
    }

    public ResponseEntity<String> compare(CompareRequestDTO request, Long userId) {
        return exchangeRaw(HttpMethod.POST, "/api/ai/compare", toAIServiceCompareRequest(request, userId), userId);
    }

    public ResponseEntity<String> getComparisonStatus(Long comparisonId, Long userId) {
        return getRaw("/api/ai/compare/" + comparisonId + "/status", userId);
    }

    public ResponseEntity<String> getComparisonResult(Long comparisonId, Long userId) {
        return getRaw("/api/ai/compare/" + comparisonId + "/result", userId);
    }

    /** AI coach for one analysis (cached by the AI service; may take a few seconds with an LLM). */
    public ResponseEntity<String> coach(Long analysisId, Long userId, String level, boolean refresh) {
        return exchangeRaw(HttpMethod.POST, "/api/ai/coach/" + analysisId, new AIServiceCoachRequest(level, refresh), userId);
    }

    private static String requireUploadFileName(String uploadReference, String field) {
        String fileName = toUploadFileName(uploadReference);
        if (fileName == null) {
            throw new IllegalArgumentException(field + " is required");
        }
        return fileName;
    }

    // --- Pass-through helpers -------------------------------------------------------------

    private ResponseEntity<String> getRaw(String path, Long userId) {
        return exchangeRaw(HttpMethod.GET, path, null, userId);
    }

    /**
     * Headers carrying the caller's id. The AI service only returns analyses, comparisons and
     * coaching that belong to this user (404 otherwise); reference tracks are shared (userId null).
     */
    static HttpHeaders userHeaders(Long userId) {
        HttpHeaders headers = new HttpHeaders();
        if (userId != null) {
            headers.set(USER_HEADER, userId.toString());
        }
        return headers;
    }

    /**
     * Pass-through call: the body (if any) is sent in snake_case, and the AI service's JSON
     * body AND status code reach the frontend unchanged, so e.g.
     * 400 {"detail": "Analysis not completed yet"} is not turned into 500.
     */
    private ResponseEntity<String> exchangeRaw(HttpMethod method, String path, Object body, Long userId) {
        try {
            HttpHeaders headers = userHeaders(userId);
            headers.setContentType(MediaType.APPLICATION_JSON);
            String json = body == null ? null : aiObjectMapper().writeValueAsString(body);
            ResponseEntity<String> response = rawRestTemplate.exchange(
                    aiServiceUrl + path, method, new HttpEntity<>(json, headers), String.class);
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
