package com.example.fitsense.user.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UserUpdateRequest(
        @Size(max = 120, message = "displayName must not exceed 120 characters")
        String displayName,

        LocalDate birthDate,

        @DecimalMin(value = "50.0", message = "heightCm must be at least 50.0 cm")
        @DecimalMax(value = "260.0", message = "heightCm must not exceed 260.0 cm")
        BigDecimal heightCm,

        @DecimalMin(value = "20.0", message = "weightKg must be at least 20.0 kg")
        @DecimalMax(value = "400.0", message = "weightKg must not exceed 400.0 kg")
        BigDecimal weightKg,

        @Pattern(regexp = "^(male|female|other|prefer_not_to_say)$", message = "gender must be one of: male, female, other, prefer_not_to_say")
        String gender,

        @Pattern(regexp = "^(beginner|intermediate|advanced)$", message = "fitnessLevel must be one of: beginner, intermediate, advanced")
        String fitnessLevel,

        @Size(max = 512, message = "avatarUrl must not exceed 512 characters")
        String avatarUrl
) {
}
