package com.musicmash.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** The password hash must never appear in JSON, even when an entity embeds the User. */
class UserSerializationTest {

    @Test
    void passwordHashIsNeverSerialised() throws Exception {
        User user = new User("demo_player", "demo@musicmash.local", "$2a$10$hash", Role.USER, true);
        String json = new ObjectMapper().registerModule(new JavaTimeModule())
                .writeValueAsString(new UserStats(user));
        assertFalse(json.contains("password"), json);
        assertFalse(json.contains("$2a$10$hash"), json);
        assertTrue(json.contains("demo_player"));
    }
}
