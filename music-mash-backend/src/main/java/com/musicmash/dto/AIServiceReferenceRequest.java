package com.musicmash.dto;

/**
 * Spring -> AI service POST /api/ai/references, serialised in snake_case.
 * audioFile is a plain file name in the shared upload directory.
 */
public record AIServiceReferenceRequest(
        String title,
        String artist,
        String instrument,
        String audioFile,
        Long uploadedBy
) {}
