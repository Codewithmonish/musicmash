package com.musicmash.controller;

import com.musicmash.entity.Competition;
import com.musicmash.entity.Participation;
import com.musicmash.entity.User;
import com.musicmash.repository.UserRepository;
import com.musicmash.service.CompetitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/competitions")
@CrossOrigin(origins = "*")
public class CompetitionController {

    private final CompetitionService competitionService;
    private final UserRepository userRepository;

    public CompetitionController(CompetitionService competitionService, UserRepository userRepository) {
        this.competitionService = competitionService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Competition>> getAllCompetitions() {
        return ResponseEntity.ok(competitionService.getAllCompetitions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Competition> getCompetitionById(@PathVariable Long id) {
        return ResponseEntity.ok(competitionService.getCompetitionById(id));
    }

    @PostMapping
    public ResponseEntity<Competition> createCompetition(@RequestBody Map<String, Object> body, Authentication authentication) {
        String email = authentication.getName();
        User host = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String title = (String) body.get("title");
        String description = (String) body.get("description");
        String category = (String) body.getOrDefault("category", "GENERAL");
        String instrument = (String) body.getOrDefault("instrument", "ALL");
        String prize = (String) body.getOrDefault("prize", "Trophy & Badges");
        Integer maxParticipants = body.get("maxParticipants") != null ? Integer.parseInt(body.get("maxParticipants").toString()) : 100;
        
        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = LocalDateTime.now().plusDays(30);

        Competition comp = competitionService.createCompetition(host.getId(), title, description, category, instrument, prize, maxParticipants, startDate, endDate);
        return ResponseEntity.status(HttpStatus.CREATED).body(comp);
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<Map<String, Object>> register(@PathVariable Long id, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> result = competitionService.registerUserForCompetition(id, user.getId());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<List<Participation>> getParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(competitionService.getCompetitionParticipants(id));
    }
}
