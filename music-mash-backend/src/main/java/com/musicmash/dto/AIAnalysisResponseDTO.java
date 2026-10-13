package com.musicmash.dto;

import java.time.LocalDateTime;

public class AIAnalysisResponseDTO {
    private Long id;
    private Long performanceId;
    private Long userId;
    private String status;
    private String message;
    private LocalDateTime createdAt;

    public AIAnalysisResponseDTO() {}

    public AIAnalysisResponseDTO(Long id, Long performanceId, Long userId, String status, String message, LocalDateTime createdAt) {
        this.id = id;
        this.performanceId = performanceId;
        this.userId = userId;
        this.status = status;
        this.message = message;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPerformanceId() { return performanceId; }
    public void setPerformanceId(Long performanceId) { this.performanceId = performanceId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
