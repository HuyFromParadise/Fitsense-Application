package com.example.fitsense.exercise.dto;

import com.example.fitsense.exercise.entity.GpsPointEntity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import lombok.Builder;

@Builder
public record GpsPointDto(
        @Min(value = 0, message = "seq must be >= 0")
        int seq,

        @NotNull(message = "latitude is required")
        @DecimalMin(value = "-90.0", message = "latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "latitude must be <= 90")
        Double latitude,

        @NotNull(message = "longitude is required")
        @DecimalMin(value = "-180.0", message = "longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "longitude must be <= 180")
        Double longitude,

        Double altitudeM,
        Double speedMps,
        Double accuracyM,

        @NotNull(message = "recordedAt is required")
        Instant recordedAt
) {
    public GpsPointEntity toEntity() {
        return GpsPointEntity.builder()
                .seq(seq)
                .latitude(BigDecimal.valueOf(latitude).setScale(6, RoundingMode.HALF_UP))
                .longitude(BigDecimal.valueOf(longitude).setScale(6, RoundingMode.HALF_UP))
                .altitudeM(altitudeM)
                .speedMps(speedMps)
                .accuracyM(accuracyM)
                .recordedAt(recordedAt)
                .build();
    }

    public static GpsPointDto fromEntity(GpsPointEntity entity) {
        return GpsPointDto.builder()
                .seq(entity.getSeq())
                .latitude(entity.getLatitude().doubleValue())
                .longitude(entity.getLongitude().doubleValue())
                .altitudeM(entity.getAltitudeM())
                .speedMps(entity.getSpeedMps())
                .accuracyM(entity.getAccuracyM())
                .recordedAt(entity.getRecordedAt())
                .build();
    }
}
