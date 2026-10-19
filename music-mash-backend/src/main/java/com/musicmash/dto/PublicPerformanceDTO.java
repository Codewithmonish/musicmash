package com.musicmash.dto;

import com.musicmash.entity.Performance;

import java.time.LocalDateTime;

/**
 * A performance as shown to anyone (landing page "Trending"). Only public, real fields:
 * no play counts or likes, because the platform does not record them.
 */
public record PublicPerformanceDTO(
        Long id,
        String title,
        String username,
        String instrument,
        String category,
        String thumbnailUrl,
        LocalDateTime submittedAt
) {
    public static PublicPerformanceDTO from(Performance performance) {
        return new PublicPerformanceDTO(
                performance.getId(),
                performance.getTitle(),
                performance.getUser().getUsername(),
                performance.getInstrument() != null ? performance.getInstrument().name() : null,
                performance.getCategory() != null ? performance.getCategory().name() : null,
                performance.getThumbnailUrl(),
                performance.getSubmittedAt()
        );
    }
}
