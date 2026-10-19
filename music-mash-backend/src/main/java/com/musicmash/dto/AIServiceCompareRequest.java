package com.musicmash.dto;

/**
 * Spring -> AI service POST /api/ai/compare, serialised in snake_case
 * (see contracts/ai-compare-request.json). Exactly one of performanceAudioFile / analysisId.
 */
public record AIServiceCompareRequest(
        Long userId,
        Long referenceId,
        String performanceAudioFile,
        Long analysisId
) {}
