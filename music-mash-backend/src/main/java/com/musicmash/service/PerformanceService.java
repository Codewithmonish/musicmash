package com.musicmash.service;

import com.musicmash.dto.PerformanceRequestDTO;
import com.musicmash.dto.PerformanceResponseDTO;
import com.musicmash.entity.*;
import com.musicmash.exception.ResourceNotFoundException;
import com.musicmash.repository.PerformanceRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PerformanceService {

    private final PerformanceRepository performanceRepository;
    private final UserRepository userRepository;

    public PerformanceService(PerformanceRepository performanceRepository, UserRepository userRepository) {
        this.performanceRepository = performanceRepository;
        this.userRepository = userRepository;
    }

    public PerformanceResponseDTO createPerformance(Long userId, PerformanceRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Performance performance = new Performance(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getCategory(),
                request.getInstrument(),
                request.getDifficulty(),
                request.getAudioUrl(),
                request.getVideoUrl(),
                request.getThumbnailUrl(),
                PerformanceStatus.DRAFT
        );

        Performance savedPerformance = performanceRepository.save(performance);
        return mapToResponseDTO(savedPerformance);
    }

    public PerformanceResponseDTO updatePerformance(Long id, Long userId, PerformanceRequestDTO request) {
        Performance performance = performanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Performance not found with id: " + id));

        if (!performance.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only edit your own performances");
        }

        if (performance.getStatus() != PerformanceStatus.DRAFT) {
            throw new RuntimeException("Can only edit draft performances");
        }

        performance.setTitle(request.getTitle());
        performance.setDescription(request.getDescription());
        performance.setCategory(request.getCategory());
        performance.setInstrument(request.getInstrument());
        performance.setDifficulty(request.getDifficulty());
        performance.setAudioUrl(request.getAudioUrl());
        performance.setVideoUrl(request.getVideoUrl());
        performance.setThumbnailUrl(request.getThumbnailUrl());

        Performance savedPerformance = performanceRepository.save(performance);
        return mapToResponseDTO(savedPerformance);
    }

    public void deletePerformance(Long id, Long userId) {
        Performance performance = performanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Performance not found with id: " + id));

        if (!performance.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only delete your own performances");
        }

        if (performance.getStatus() != PerformanceStatus.DRAFT) {
            throw new RuntimeException("Can only delete draft performances");
        }

        performanceRepository.delete(performance);
    }

    public PerformanceResponseDTO submitPerformance(Long id, Long userId) {
        Performance performance = performanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Performance not found with id: " + id));

        if (!performance.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only submit your own performances");
        }

        if (performance.getStatus() != PerformanceStatus.DRAFT) {
            throw new RuntimeException("Can only submit draft performances");
        }

        performance.setStatus(PerformanceStatus.SUBMITTED);
        Performance savedPerformance = performanceRepository.save(performance);
        return mapToResponseDTO(savedPerformance);
    }

    public PerformanceResponseDTO getPerformanceById(Long id) {
        Performance performance = performanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Performance not found with id: " + id));
        return mapToResponseDTO(performance);
    }

    public List<PerformanceResponseDTO> getUserPerformances(Long userId) {
        List<Performance> performances = performanceRepository.findByUserIdOrderBySubmittedAtDesc(userId);
        return performances.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    public List<PerformanceResponseDTO> getSubmittedPerformances(Instrument instrument, 
                                                                   PerformanceCategory category,
                                                                   DifficultyLevel difficulty) {
        List<Performance> performances = performanceRepository.findSubmittedPerformancesWithFilters(
                PerformanceStatus.SUBMITTED, instrument, category, difficulty);
        return performances.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    private PerformanceResponseDTO mapToResponseDTO(Performance performance) {
        return new PerformanceResponseDTO(
                performance.getId(),
                performance.getUser().getId(),
                performance.getUser().getUsername(),
                performance.getTitle(),
                performance.getDescription(),
                performance.getCategory(),
                performance.getInstrument(),
                performance.getDifficulty(),
                performance.getAudioUrl(),
                performance.getVideoUrl(),
                performance.getThumbnailUrl(),
                performance.getStatus(),
                performance.getSubmittedAt(),
                performance.getUpdatedAt()
        );
    }
}
