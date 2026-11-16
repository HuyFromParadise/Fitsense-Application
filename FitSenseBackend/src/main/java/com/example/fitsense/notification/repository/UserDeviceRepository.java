package com.example.fitsense.notification.repository;

import com.example.fitsense.notification.entity.UserDeviceEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDeviceEntity, UUID> {
    List<UserDeviceEntity> findByUserId(UUID userId);
    Optional<UserDeviceEntity> findByUserIdAndDeviceId(UUID userId, String deviceId);
    Optional<UserDeviceEntity> findByFcmToken(String fcmToken);
}
