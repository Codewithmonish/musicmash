package com.musicmash.dto;

/**
 * The body Spring sends to the AI service's POST /api/ai/analyze.
 *
 * Serialised in snake_case by AIIntegrationService (see contracts/ai-analyze-request.json).
 * audioFile / videoFile are plain file names inside the upload directory that both services
 * share, never URLs or paths.
 */
public record AIServiceAnalyzeRequest(
        Long performanceId,
        Long userId,
        String audioFile,
        String videoFile,
        String instrument,
        String category
) {}
