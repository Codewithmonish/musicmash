package com.musicmash.service;

import com.musicmash.entity.Challenge;
import com.musicmash.repository.ChallengeRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChallengeService {

    private final ChallengeRepository challengeRepository;

    public ChallengeService(ChallengeRepository challengeRepository) {
        this.challengeRepository = challengeRepository;
    }

    public List<Challenge> getAllActiveChallenges() {
        List<Challenge> list = challengeRepository.findByStatus("ACTIVE");
        if (list.isEmpty()) {
            // Provide default active challenges if table is empty
            Challenge c1 = new Challenge("Daily Rhythm Accuracy", "Maintain 90%+ timing accuracy on any track in Practice Arena.", "Record or practice 1 track today.", 100, LocalDateTime.now(), LocalDateTime.now().plusDays(1));
            Challenge c2 = new Challenge("Weekly Studio Performance", "Upload 1 full audio or video performance to Command Center.", "Audio/Video required.", 250, LocalDateTime.now(), LocalDateTime.now().plusDays(7));
            challengeRepository.save(c1);
            challengeRepository.save(c2);
            list = challengeRepository.findByStatus("ACTIVE");
        }
        return list;
    }

    public Challenge getChallengeById(Long id) {
        return challengeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + id));
    }
}
