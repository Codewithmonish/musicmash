package com.musicmash.service;

import com.musicmash.entity.Follow;
import com.musicmash.entity.User;
import com.musicmash.repository.FollowRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SocialService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public SocialService(FollowRepository followRepository, UserRepository userRepository, NotificationService notificationService) {
        this.followRepository = followRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public Map<String, Object> followUser(Long followerId, Long targetUserId) {
        if (followerId.equals(targetUserId)) {
            throw new RuntimeException("You cannot follow yourself");
        }

        User follower = userRepository.findById(followerId).orElseThrow(() -> new RuntimeException("Follower not found"));
        User target = userRepository.findById(targetUserId).orElseThrow(() -> new RuntimeException("Target user not found"));

        if (!followRepository.existsByFollowerIdAndFollowingId(followerId, targetUserId)) {
            Follow follow = new Follow(follower, target);
            followRepository.save(follow);

            notificationService.createNotification(
                    target,
                    "ANNOUNCEMENT",
                    "New Follower!",
                    follower.getUsername() + " started following your musical journey."
            );
        }

        Map<String, Object> res = new HashMap<>();
        res.put("following", true);
        res.put("targetUserId", targetUserId);
        return res;
    }

    @Transactional
    public Map<String, Object> unfollowUser(Long followerId, Long targetUserId) {
        Optional<Follow> followOpt = followRepository.findByFollowerIdAndFollowingId(followerId, targetUserId);
        followOpt.ifPresent(followRepository::delete);

        Map<String, Object> res = new HashMap<>();
        res.put("following", false);
        res.put("targetUserId", targetUserId);
        return res;
    }

    public List<Map<String, Object>> discoverMusicians(Long currentUserId) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User u : users) {
            if (!u.getId().equals(currentUserId)) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", u.getId());
                map.put("username", u.getUsername());
                map.put("role", u.getRole().name());
                map.put("isFollowing", followRepository.existsByFollowerIdAndFollowingId(currentUserId, u.getId()));
                map.put("followersCount", followRepository.countByFollowingId(u.getId()));
                result.add(map);
            }
        }
        return result;
    }
}
