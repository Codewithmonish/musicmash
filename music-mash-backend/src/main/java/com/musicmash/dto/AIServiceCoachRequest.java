package com.musicmash.dto;

/**
 * Spring -> AI service body for POST /api/ai/coach/{analysisId} (sent in snake_case).
 * level is the user's experience level from their profile (null if they have no profile).
 */
public record AIServiceCoachRequest(String level, boolean refresh) {}
