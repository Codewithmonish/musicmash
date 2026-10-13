package com.musicmash.service;

import com.musicmash.dto.ProfileRequestDTO;
import com.musicmash.dto.ProfileResponseDTO;
import com.musicmash.entity.Profile;
import com.musicmash.entity.User;
import com.musicmash.exception.ResourceNotFoundException;
import com.musicmash.repository.ProfileRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;

    public ProfileService(ProfileRepository profileRepository, UserRepository userRepository) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
    }

    public ProfileResponseDTO getProfileByUserId(Long userId) {
        Profile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user id: " + userId));
        return mapToResponseDTO(profile);
    }

    public ProfileResponseDTO getProfileById(Long id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found with id: " + id));
        return mapToResponseDTO(profile);
    }

    public ProfileResponseDTO createOrUpdateProfile(Long userId, ProfileRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Profile profile = profileRepository.findByUserId(userId)
                .orElse(new Profile());

        profile.setUser(user);
        profile.setDisplayName(request.getDisplayName());
        profile.setBio(request.getBio());
        profile.setCountry(request.getCountry());
        profile.setExperienceLevel(request.getExperienceLevel());
        profile.setPrimaryInstrument(request.getPrimaryInstrument());
        profile.setSecondaryInstrument(request.getSecondaryInstrument());
        profile.setMusicGenres(request.getMusicGenres());
        profile.setProfileImage(request.getProfileImage());

        Profile savedProfile = profileRepository.save(profile);
        return mapToResponseDTO(savedProfile);
    }

    private ProfileResponseDTO mapToResponseDTO(Profile profile) {
        return new ProfileResponseDTO(
                profile.getId(),
                profile.getUser().getId(),
                profile.getUser().getUsername(),
                profile.getDisplayName(),
                profile.getBio(),
                profile.getCountry(),
                profile.getExperienceLevel(),
                profile.getPrimaryInstrument(),
                profile.getSecondaryInstrument(),
                profile.getMusicGenres(),
                profile.getProfileImage(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
