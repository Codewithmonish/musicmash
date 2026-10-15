package com.musicmash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.musicmash.dto.AIAnalysisRequestDTO;
import com.musicmash.dto.AIAnalysisResponseDTO;
import com.musicmash.dto.AIServiceAnalyzeRequest;
import com.musicmash.dto.AIServiceCompareRequest;
import com.musicmash.dto.CompareRequestDTO;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the wire format between Spring and the AI service to the shared fixtures in
 * ../contracts/. The AI service's tests/test_contract.py checks the same files.
 */
class AIServiceContractTest {

    private static final Path CONTRACTS = Path.of("..", "contracts");
    private final ObjectMapper aiMapper = AIIntegrationService.aiObjectMapper();
    private final ObjectMapper plainMapper = new ObjectMapper();

    private JsonNode fixture(String name) throws Exception {
        return plainMapper.readTree(Files.readString(CONTRACTS.resolve(name)));
    }

    @Test
    void requestIsSerialisedExactlyAsTheContract() throws Exception {
        AIAnalysisRequestDTO fromFrontend = new AIAnalysisRequestDTO(
                42L, 7L, "/uploads/3f2a9c1e-5b7d-4e2a-9c1e-5b7d4e2a9c1e.wav", null, "VIOLIN", "CLASSICAL");

        AIServiceAnalyzeRequest body = AIIntegrationService.toAIServiceRequest(fromFrontend);
        JsonNode sent = plainMapper.readTree(aiMapper.writeValueAsString(body));

        assertEquals(fixture("ai-analyze-request.json"), sent);
    }

    @Test
    void responseFromTheAIServiceIsFullyRead() throws Exception {
        String json = Files.readString(CONTRACTS.resolve("ai-analyze-response.json"));

        AIAnalysisResponseDTO response = aiMapper.readValue(json, AIAnalysisResponseDTO.class);

        assertEquals(1L, response.getId());
        assertEquals(42L, response.getPerformanceId());
        assertEquals(7L, response.getUserId());
        assertEquals("PENDING", response.getStatus());
        assertEquals("Analysis queued for processing", response.getMessage());
        assertEquals(LocalDateTime.of(2026, 10, 13, 21, 15, 4, 123_456_000), response.getCreatedAt());
    }

    @Test
    void uploadReferencesBecomePlainFileNames() {
        assertEquals("abc-123.wav", AIIntegrationService.toUploadFileName("/uploads/abc-123.wav"));
        assertNull(AIIntegrationService.toUploadFileName(null));
    }

    @Test
    void anythingButAnUploadReferenceIsRejected() {
        for (String bad : new String[]{
                "http://example.com/a.wav", "C:\\audio\\a.wav", "/uploads/../secret.wav",
                "/uploads/sub/a.wav", "/etc/passwd", "a.wav"}) {
            assertThrows(IllegalArgumentException.class, () -> AIIntegrationService.toUploadFileName(bad), bad);
        }
    }

    @Test
    void aRequestWithoutMediaIsRejected() {
        AIAnalysisRequestDTO empty = new AIAnalysisRequestDTO(1L, 1L, null, null, null, null);
        assertThrows(IllegalArgumentException.class, () -> AIIntegrationService.toAIServiceRequest(empty));
    }

    @Test
    void compareRequestIsSerialisedExactlyAsTheContract() throws Exception {
        CompareRequestDTO fromFrontend = new CompareRequestDTO(
                3L, "/uploads/9b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e.wav", null);

        AIServiceCompareRequest body = AIIntegrationService.toAIServiceCompareRequest(fromFrontend, 7L);
        JsonNode sent = plainMapper.readTree(aiMapper.writeValueAsString(body));

        assertEquals(fixture("ai-compare-request.json"), sent);
    }

    @Test
    void compareNeedsExactlyOneAudioSource() {
        assertThrows(IllegalArgumentException.class, () -> AIIntegrationService.toAIServiceCompareRequest(
                new CompareRequestDTO(3L, null, null), 7L));
        assertThrows(IllegalArgumentException.class, () -> AIIntegrationService.toAIServiceCompareRequest(
                new CompareRequestDTO(3L, "/uploads/a.wav", 5L), 7L));
        assertEquals(5L, AIIntegrationService.toAIServiceCompareRequest(
                new CompareRequestDTO(3L, null, 5L), 7L).analysisId());
    }
}
