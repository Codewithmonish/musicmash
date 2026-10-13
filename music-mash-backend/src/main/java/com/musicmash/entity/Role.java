package com.musicmash.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    USER,
    JUDGE,
    HOST,
    ADMIN;

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
