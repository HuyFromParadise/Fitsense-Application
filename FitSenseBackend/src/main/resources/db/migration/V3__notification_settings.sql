-- FitSense schema V3: Persistent user notification preferences.

CREATE TABLE notification_settings (
    user_id                    BINARY(16)  NOT NULL,
    weekly_report_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    workout_reminders_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
    goal_achievements_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
    quiet_hours_start          VARCHAR(5)  NOT NULL DEFAULT '22:00',
    quiet_hours_end            VARCHAR(5)  NOT NULL DEFAULT '07:00',
    created_at                 DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                 DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
