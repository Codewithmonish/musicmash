package com.musicmash.dto;

/**
 * Frontend -> Spring: compare a performance with a reference track. Give either
 * performanceAudioUrl ("/uploads/<file>") or analysisId (re-use that analysis's audio).
 */
public class CompareRequestDTO {
    private Long referenceId;
    private String performanceAudioUrl;
    private Long analysisId;

    public CompareRequestDTO() {}

    public CompareRequestDTO(Long referenceId, String performanceAudioUrl, Long analysisId) {
        this.referenceId = referenceId;
        this.performanceAudioUrl = performanceAudioUrl;
        this.analysisId = analysisId;
    }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public String getPerformanceAudioUrl() { return performanceAudioUrl; }
    public void setPerformanceAudioUrl(String performanceAudioUrl) { this.performanceAudioUrl = performanceAudioUrl; }

    public Long getAnalysisId() { return analysisId; }
    public void setAnalysisId(Long analysisId) { this.analysisId = analysisId; }
}
