package com.musicmash.service;

import com.musicmash.dto.EvaluationRequestDTO;
import com.musicmash.dto.EvaluationResponseDTO;
import com.musicmash.entity.Evaluation;
import com.musicmash.entity.Notification;
import com.musicmash.entity.Performance;
import com.musicmash.entity.PerformanceStatus;
import com.musicmash.entity.Role;
import com.musicmash.entity.User;
import com.musicmash.exception.ResourceNotFoundException;
import com.musicmash.repository.EvaluationRepository;
import com.musicmash.repository.PerformanceRepository;
import com.musicmash.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final PerformanceRepository performanceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public EvaluationService(EvaluationRepository evaluationRepository, 
                           PerformanceRepository performanceRepository,
                           UserRepository userRepository,
                           NotificationService notificationService) {
        this.evaluationRepository = evaluationRepository;
        this.performanceRepository = performanceRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public EvaluationResponseDTO createEvaluation(Long performanceId, Long judgeId, EvaluationRequestDTO request) {
        User judge = userRepository.findById(judgeId)
                .orElseThrow(() -> new ResourceNotFoundException("Judge not found with id: " + judgeId));

        if (judge.getRole() != Role.JUDGE && judge.getRole() != Role.HOST && judge.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only judges can evaluate performances");
        }

        Performance performance = performanceRepository.findById(performanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Performance not found with id: " + performanceId));

        if (performance.getStatus() != PerformanceStatus.SUBMITTED && performance.getStatus() != PerformanceStatus.UNDER_REVIEW) {
            throw new RuntimeException("Can only evaluate submitted performances");
        }

        if (evaluationRepository.existsByPerformanceId(performanceId)) {
            throw new RuntimeException("Performance has already been evaluated");
        }

        // Calculate overall score as average of all scores
        int overallScore = calculateOverallScore(request);

        Evaluation evaluation = new Evaluation(
                performance,
                judge,
                request.getPitchScore(),
                request.getRhythmScore(),
                request.getTimingScore(),
                request.getTechniqueScore(),
                request.getCreativityScore(),
                request.getExpressionScore(),
                overallScore,
                request.getFeedback()
        );

        // Update performance status to APPROVED
        performance.setStatus(PerformanceStatus.APPROVED);
        performanceRepository.save(performance);

        Evaluation savedEvaluation = evaluationRepository.save(evaluation);

        // Send notification to performer
        notificationService.createNotification(
                performance.getUser(),
                "Performance Evaluated",
                "Your performance '" + performance.getTitle() + "' has been evaluated. Overall score: " + overallScore,
                "EVALUATION",
                savedEvaluation.getId()
        );

        return mapToResponseDTO(savedEvaluation);
    }

    public EvaluationResponseDTO getEvaluationByPerformanceId(Long performanceId) {
        Evaluation evaluation = evaluationRepository.findByPerformanceId(performanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found for performance id: " + performanceId));
        return mapToResponseDTO(evaluation);
    }

    public EvaluationResponseDTO getEvaluationById(Long id) {
        Evaluation evaluation = evaluationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluation not found with id: " + id));
        return mapToResponseDTO(evaluation);
    }

    private int calculateOverallScore(EvaluationRequestDTO request) {
        int sum = request.getPitchScore() + request.getRhythmScore() + request.getTimingScore() +
                 request.getTechniqueScore() + request.getCreativityScore() + request.getExpressionScore();
        return sum / 6;
    }

    private EvaluationResponseDTO mapToResponseDTO(Evaluation evaluation) {
        return new EvaluationResponseDTO(
                evaluation.getId(),
                evaluation.getPerformance().getId(),
                evaluation.getPerformance().getTitle(),
                evaluation.getJudge().getId(),
                evaluation.getJudge().getUsername(),
                evaluation.getPitchScore(),
                evaluation.getRhythmScore(),
                evaluation.getTimingScore(),
                evaluation.getTechniqueScore(),
                evaluation.getCreativityScore(),
                evaluation.getExpressionScore(),
                evaluation.getOverallScore(),
                evaluation.getFeedback(),
                evaluation.getCreatedAt()
        );
    }
}
