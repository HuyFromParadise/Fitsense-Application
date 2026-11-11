package com.example.fitsense.user.dto;

import com.example.fitsense.user.entity.UserEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record UserResponse(
        UUID id,
        String email,
        String displayName,
        LocalDate birthDate,
        BigDecimal heightCm,
        BigDecimal weightKg,
        String gender,
        String fitnessLevel,
        String avatarUrl,
        Double bmi,
        Instant createdAt
) {
    public static UserResponse fromEntity(UserEntity user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .birthDate(user.getBirthDate())
                .heightCm(user.getHeightCm())
                .weightKg(user.getWeightKg())
                .gender(user.getGender())
                .fitnessLevel(user.getFitnessLevel())
                .avatarUrl(user.getAvatarUrl())
                .bmi(user.calculateBmi())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
