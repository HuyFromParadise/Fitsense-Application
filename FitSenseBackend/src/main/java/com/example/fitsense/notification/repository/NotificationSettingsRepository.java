package com.example.fitsense.notification.repository;

import com.example.fitsense.notification.entity.NotificationSettingsEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationSettingsRepository
        extends JpaRepository<NotificationSettingsEntity, UUID> {
}
