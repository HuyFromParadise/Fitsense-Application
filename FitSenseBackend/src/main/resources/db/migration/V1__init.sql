-- FitSense schema V1.
-- Every table is created on day 1, including tables for features not implemented yet,
-- so features never have to edit this migration. Structural changes go in V2__... by the owner.

CREATE TABLE users (
    id              BINARY(16)    NOT NULL,
    firebase_uid    VARCHAR(128)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    display_name    VARCHAR(120)  NULL,
    birth_date      DATE          NULL,
    height_cm       DECIMAL(5, 1) NULL,
    weight_kg       DECIMAL(5, 1) NULL,
    gender          VARCHAR(16)   NULL,
    fitness_level   VARCHAR(16)   NULL,
    avatar_url      VARCHAR(512)  NULL,
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_firebase_uid (firebase_uid),
    UNIQUE KEY uk_users_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_devices (
    id              BINARY(16)   NOT NULL,
    user_id         BINARY(16)   NOT NULL,
    device_id       VARCHAR(128) NOT NULL,
    platform        VARCHAR(16)  NOT NULL,
    fcm_token       VARCHAR(512) NULL,
    last_sync_at    DATETIME(6)  NULL,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_devices_user_device (user_id, device_id),
    CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE daily_activities (
    id                BINARY(16)   NOT NULL,
    user_id           BINARY(16)   NOT NULL,
    activity_date     DATE         NOT NULL,
    timezone_id       VARCHAR(64)  NOT NULL,
    steps             INT          NOT NULL DEFAULT 0,
    distance_m        DOUBLE       NOT NULL DEFAULT 0,
    calories          DOUBLE       NOT NULL DEFAULT 0,
    active_minutes    INT          NOT NULL DEFAULT 0,
    client_updated_at DATETIME(6)  NOT NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_daily_activities_user_date (user_id, activity_date),
    CONSTRAINT fk_daily_activities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE exercise_sessions (
    id              BINARY(16)  NOT NULL,
    user_id         BINARY(16)  NOT NULL,
    exercise_type   VARCHAR(32) NOT NULL,
    status          VARCHAR(16) NOT NULL,
    started_at      DATETIME(6) NOT NULL,
    ended_at        DATETIME(6) NULL,
    paused_seconds  INT         NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_exercise_sessions_user_started (user_id, started_at),
    CONSTRAINT fk_exercise_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE gps_points (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    session_id      BINARY(16)    NOT NULL,
    seq             INT           NOT NULL,
    latitude        DECIMAL(9, 6) NOT NULL,
    longitude       DECIMAL(9, 6) NOT NULL,
    altitude_m      DOUBLE        NULL,
    speed_mps       DOUBLE        NULL,
    accuracy_m      DOUBLE        NULL,
    recorded_at     DATETIME(6)   NOT NULL,
    created_at      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_gps_points_session_seq (session_id, seq),
    CONSTRAINT fk_gps_points_session FOREIGN KEY (session_id) REFERENCES exercise_sessions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE exercise_metrics (
    id                   BINARY(16) NOT NULL,
    session_id           BINARY(16) NOT NULL,
    distance_m           DOUBLE     NOT NULL DEFAULT 0,
    duration_seconds     INT        NOT NULL DEFAULT 0,
    avg_pace_sec_per_km  DOUBLE     NULL,
    avg_speed_mps        DOUBLE     NULL,
    calories             DOUBLE     NOT NULL DEFAULT 0,
    created_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_exercise_metrics_session (session_id),
    CONSTRAINT fk_exercise_metrics_session FOREIGN KEY (session_id) REFERENCES exercise_sessions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
