package com.musicmash.service;

import com.musicmash.entity.Achievement;
import com.musicmash.entity.User;
import com.musicmash.repository.AchievementRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserRepository userRepository;

    public AchievementService(AchievementRepository achievementRepository, UserRepository userRepository) {
        this.achievementRepository = achievementRepository;
        this.userRepository = userRepository;
    }

    public List<Achievement> getUserAchievements(Long userId) {
        return achievementRepository.findByUserId(userId);
    }

    public void awardAchievementIfMissing(Long userId, String title, String description, String iconUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!achievementRepository.existsByUserIdAndTitle(userId, title)) {
            Achievement achievement = new Achievement(user, title, description, iconUrl);
            achievementRepository.save(achievement);
        }
    }
}
