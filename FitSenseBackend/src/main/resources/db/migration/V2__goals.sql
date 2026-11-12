-- FitSense schema V2: Adds missing goals table (BUG-001)

CREATE TABLE goals (
    id              BINARY(16)   NOT NULL,
    user_id         BINARY(16)   NOT NULL,
    goal_type       VARCHAR(32)  NOT NULL,
    target_value    DOUBLE       NOT NULL,
    starts_on       DATE         NOT NULL,
    ends_on         DATE         NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_goals_user_enabled (user_id, enabled),
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
