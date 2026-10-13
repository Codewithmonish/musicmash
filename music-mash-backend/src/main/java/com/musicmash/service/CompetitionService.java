package com.musicmash.service;

import com.musicmash.entity.Competition;
import com.musicmash.entity.CompetitionStatus;
import com.musicmash.entity.Participation;
import com.musicmash.entity.User;
import com.musicmash.repository.CompetitionRepository;
import com.musicmash.repository.ParticipationRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class CompetitionService {

    private final CompetitionRepository competitionRepository;
    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public CompetitionService(CompetitionRepository competitionRepository,
                              ParticipationRepository participationRepository,
                              UserRepository userRepository,
                              NotificationService notificationService) {
        this.competitionRepository = competitionRepository;
        this.participationRepository = participationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<Competition> getAllCompetitions() {
        return competitionRepository.findAll();
    }

    public Competition getCompetitionById(Long id) {
        return competitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Competition not found with ID: " + id));
    }

    @Transactional
    public Competition createCompetition(Long hostUserId, String title, String description, String category, String instrument, String prize, Integer maxParticipants, LocalDateTime startDate, LocalDateTime endDate) {
        User host = userRepository.findById(hostUserId)
                .orElseThrow(() -> new RuntimeException("Host user not found"));

        Competition competition = new Competition(host, title, description, category, instrument, startDate, endDate, prize, maxParticipants);
        competition.setStatus(CompetitionStatus.OPEN);
        return competitionRepository.save(competition);
    }

    @Transactional
    public Map<String, Object> registerUserForCompetition(Long competitionId, Long userId) {
        Competition competition = getCompetitionById(competitionId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (participationRepository.existsByCompetitionIdAndUserId(competitionId, userId)) {
            throw new RuntimeException("User already registered for this competition");
        }

        Participation participation = new Participation(competition, user);
        participationRepository.save(participation);

        competition.setCurrentParticipants(competition.getCurrentParticipants() + 1);
        competitionRepository.save(competition);

        // Trigger real notification
        notificationService.createNotification(
                user,
                "COMPETITION",
                "Joined Competition: " + competition.getTitle(),
                "You have successfully registered for " + competition.getTitle() + ". Submit your performance before " + competition.getEndDate()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Registered successfully");
        response.put("competitionId", competitionId);
        response.put("userId", userId);
        return response;
    }

    public List<Participation> getCompetitionParticipants(Long competitionId) {
        return participationRepository.findByCompetitionId(competitionId);
    }
}
