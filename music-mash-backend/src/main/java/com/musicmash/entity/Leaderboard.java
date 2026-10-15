package com.musicmash.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "leaderboard")
public class Leaderboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id")
    private Competition competition;

    @Column(name = "total_score")
    private BigDecimal totalScore = BigDecimal.ZERO;

    @Column(name = "rank_position") // "rank" is a reserved word in MySQL 8
    private Integer rank;

    @Column(name = "improvement_rate")
    private BigDecimal improvementRate = BigDecimal.ZERO;

    @Column(name = "consistency_score")
    private BigDecimal consistencyScore = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Leaderboard() {}

    public Leaderboard(User user, BigDecimal totalScore, Integer rank) {
        this.user = user;
        this.totalScore = totalScore;
        this.rank = rank;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Competition getCompetition() { return competition; }
    public void setCompetition(Competition competition) { this.competition = competition; }

    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }

    public Integer getRank() { return rank; }
    public void setRank(Integer rank) { this.rank = rank; }

    public BigDecimal getImprovementRate() { return improvementRate; }
    public void setImprovementRate(BigDecimal improvementRate) { this.improvementRate = improvementRate; }

    public BigDecimal getConsistencyScore() { return consistencyScore; }
    public void setConsistencyScore(BigDecimal consistencyScore) { this.consistencyScore = consistencyScore; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
