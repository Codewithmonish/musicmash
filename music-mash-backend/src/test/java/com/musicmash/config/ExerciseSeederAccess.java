package com.musicmash.config;

import com.musicmash.entity.Exercise;

import java.util.List;

/** Test access to the package-private seed list. */
public final class ExerciseSeederAccess {
    private ExerciseSeederAccess() {}

    public static List<Exercise> library() {
        return ExerciseSeeder.library();
    }
}
