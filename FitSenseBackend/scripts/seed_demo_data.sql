-- FitSense Demo Seed Script (Owner: Developer A)
-- Seeds sample user (dev-user), finished GPS exercise sessions, GPS routes, and analytics metrics for the past 14 days.
-- Usage: Execute against fitsense_db after at least one login or with dev-token UID.

SET @demo_uid = 'dev-user';
SET @user_uuid = (SELECT id FROM users WHERE firebase_uid = @demo_uid LIMIT 1);

-- Ensure demo user exists if running standalone
SET @user_uuid = COALESCE(@user_uuid, UNHEX(REPLACE(UUID(), '-', '')));
INSERT IGNORE INTO users (id, firebase_uid, email, display_name, height_cm, weight_kg, gender, fitness_level)
VALUES (@user_uuid, @demo_uid, 'dev@fitsense.local', 'FitSense Demo Runner', 175.0, 68.0, 'male', 'intermediate');

-- Re-fetch exact user_id
SET @user_uuid = (SELECT id FROM users WHERE firebase_uid = @demo_uid LIMIT 1);

-- Sample Exercise Session 1: Today morning run
SET @ex1 = UNHEX(REPLACE('11111111-1111-4111-8111-111111111101', '-', ''));
INSERT IGNORE INTO exercise_sessions (id, user_id, exercise_type, status, started_at, ended_at, paused_seconds)
VALUES (@ex1, @user_uuid, 'RUNNING', 'FINISHED', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 150 MINUTE), 60);

INSERT IGNORE INTO exercise_metrics (id, session_id, distance_m, duration_seconds, avg_pace_sec_per_km, avg_speed_mps, calories)
VALUES (UNHEX(REPLACE(UUID(), '-', '')), @ex1, 4850.0, 1740, 358.8, 2.79, 342.5);

INSERT IGNORE INTO gps_points (session_id, seq, latitude, longitude, altitude_m, speed_mps, accuracy_m, recorded_at) VALUES
(@ex1, 0, 10.776889, 106.700806, 12.0, 2.5, 6.0, DATE_SUB(NOW(), INTERVAL 180 MINUTE)),
(@ex1, 1, 10.777900, 106.701900, 12.2, 2.8, 5.0, DATE_SUB(NOW(), INTERVAL 175 MINUTE)),
(@ex1, 2, 10.779100, 106.703100, 12.5, 2.9, 5.5, DATE_SUB(NOW(), INTERVAL 170 MINUTE)),
(@ex1, 3, 10.780500, 106.704200, 13.0, 2.7, 6.2, DATE_SUB(NOW(), INTERVAL 160 MINUTE)),
(@ex1, 4, 10.781900, 106.705500, 12.8, 2.8, 4.8, DATE_SUB(NOW(), INTERVAL 150 MINUTE));

-- Sample Exercise Session 2: 2 days ago cycling
SET @ex2 = UNHEX(REPLACE('11111111-1111-4111-8111-111111111102', '-', ''));
INSERT IGNORE INTO exercise_sessions (id, user_id, exercise_type, status, started_at, ended_at, paused_seconds)
VALUES (@ex2, @user_uuid, 'CYCLING', 'FINISHED', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 45 MINUTE), 120);

INSERT IGNORE INTO exercise_metrics (id, session_id, distance_m, duration_seconds, avg_pace_sec_per_km, avg_speed_mps, calories)
VALUES (UNHEX(REPLACE(UUID(), '-', '')), @ex2, 12400.0, 2580, 208.1, 4.81, 415.0);

-- Sample Exercise Session 3: 5 days ago walking
SET @ex3 = UNHEX(REPLACE('11111111-1111-4111-8111-111111111103', '-', ''));
INSERT IGNORE INTO exercise_sessions (id, user_id, exercise_type, status, started_at, ended_at, paused_seconds)
VALUES (@ex3, @user_uuid, 'WALKING', 'FINISHED', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 40 MINUTE), 0);

INSERT IGNORE INTO exercise_metrics (id, session_id, distance_m, duration_seconds, avg_pace_sec_per_km, avg_speed_mps, calories)
VALUES (UNHEX(REPLACE(UUID(), '-', '')), @ex3, 3100.0, 2400, 774.2, 1.29, 165.0);

-- Sample Exercise Session 4: Last week running (for week-over-week analytics comparison)
SET @ex4 = UNHEX(REPLACE('11111111-1111-4111-8111-111111111104', '-', ''));
INSERT IGNORE INTO exercise_sessions (id, user_id, exercise_type, status, started_at, ended_at, paused_seconds)
VALUES (@ex4, @user_uuid, 'RUNNING', 'FINISHED', DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 9 DAY), INTERVAL 25 MINUTE), 0);

INSERT IGNORE INTO exercise_metrics (id, session_id, distance_m, duration_seconds, avg_pace_sec_per_km, avg_speed_mps, calories)
VALUES (UNHEX(REPLACE(UUID(), '-', '')), @ex4, 3800.0, 1500, 394.7, 2.53, 270.0);
