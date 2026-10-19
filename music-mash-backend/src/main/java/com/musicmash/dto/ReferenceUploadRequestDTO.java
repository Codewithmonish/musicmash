package com.musicmash.dto;

/**
 * Frontend -> Spring: register an uploaded recording as a reference track (HOST/ADMIN only).
 * audioUrl is the "/uploads/<file>" reference returned by POST /api/upload/audio.
 */
public class ReferenceUploadRequestDTO {
    private String title;
    private String artist;
    private String instrument;
    private String audioUrl;

    public ReferenceUploadRequestDTO() {}

    public ReferenceUploadRequestDTO(String title, String artist, String instrument, String audioUrl) {
        this.title = title;
        this.artist = artist;
        this.instrument = instrument;
        this.audioUrl = audioUrl;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }

    public String getInstrument() { return instrument; }
    public void setInstrument(String instrument) { this.instrument = instrument; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
}
