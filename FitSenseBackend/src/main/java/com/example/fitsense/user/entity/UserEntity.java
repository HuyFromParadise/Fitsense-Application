package com.example.fitsense.user.entity;

import com.example.fitsense.common.base.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity extends BaseEntity {

    @Column(name = "firebase_uid", nullable = false, unique = true, length = 128)
    private String firebaseUid;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "height_cm", precision = 5, scale = 1)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 1)
    private BigDecimal weightKg;

    @Column(name = "gender", length = 16)
    private String gender;

    @Column(name = "fitness_level", length = 16)
    private String fitnessLevel;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    public Double calculateBmi() {
        if (heightCm == null || weightKg == null || heightCm.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        double hM = heightCm.doubleValue() / 100.0;
        double wKg = weightKg.doubleValue();
        double bmi = wKg / (hM * hM);
        return BigDecimal.valueOf(bmi).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
