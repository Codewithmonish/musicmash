package com.musicmash.repository;

import com.musicmash.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
    List<Exercise> findAllByOrderByDifficultyAscTitleAsc();
    List<Exercise> findByInstrumentInOrderByDifficultyAscTitleAsc(Collection<String> instruments);
}
