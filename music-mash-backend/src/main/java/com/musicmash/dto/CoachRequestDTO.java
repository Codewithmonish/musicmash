package com.musicmash.dto;

/** Frontend -> Spring: optional body for the AI coach. refresh = generate again instead of using the cache. */
public class CoachRequestDTO {
    private Boolean refresh;

    public CoachRequestDTO() {}

    public Boolean getRefresh() { return refresh; }
    public void setRefresh(Boolean refresh) { this.refresh = refresh; }
}
