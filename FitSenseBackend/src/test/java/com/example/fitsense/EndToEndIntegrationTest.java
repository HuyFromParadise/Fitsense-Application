package com.example.fitsense;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "fitsense.notifications.admin-trigger-key=e2e-admin-secret"
})
@AutoConfigureMockMvc
class EndToEndIntegrationTest {

    private static final String DEV_AUTH = "Bearer dev-token";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void fullStackFlow_userGoalsSyncAnalyticsAndNotifications() throws Exception {
        // 1. Health check (public)
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 2. Get or create user profile
        mockMvc.perform(get("/api/users/me").header("Authorization", DEV_AUTH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isNotEmpty());

        // 3. Create active DAILY_STEPS goal
        mockMvc.perform(post("/api/goals")
                        .header("Authorization", DEV_AUTH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "DAILY_STEPS",
                                  "targetValue": 5000,
                                  "startsOn": "2026-11-01"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type").value("DAILY_STEPS"));

        // 4. Register device -> 204 No Content
        mockMvc.perform(post("/api/notifications/devices")
                        .header("Authorization", DEV_AUTH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "deviceId": "emu-dev-1",
                                  "platform": "android",
                                  "fcmToken": "fcm-tok-1"
                                }
                                """))
                .andExpect(status().isNoContent());

        // 5. Persist notification settings in DB and read back
        mockMvc.perform(put("/api/notifications/settings")
                        .header("Authorization", DEV_AUTH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "weeklyReportEnabled": false,
                                  "workoutRemindersEnabled": true,
                                  "goalAchievementsEnabled": true,
                                  "quietHoursStart": "23:00",
                                  "quietHoursEnd": "06:30"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weeklyReportEnabled").value(false))
                .andExpect(jsonPath("$.data.quietHoursStart").value("23:00"));

        mockMvc.perform(get("/api/notifications/settings").header("Authorization", DEV_AUTH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weeklyReportEnabled").value(false))
                .andExpect(jsonPath("$.data.quietHoursStart").value("23:00"));

        // 6. Trigger weekly report security check
        mockMvc.perform(post("/api/notifications/weekly-report/trigger")
                        .header("Authorization", DEV_AUTH))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/notifications/weekly-report/trigger")
                        .header("Authorization", DEV_AUTH)
                        .header("X-Admin-Key", "e2e-admin-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reportsSent").isNumber());

        // 7. Sync offline DAILY_ACTIVITY + EXERCISE via /api/sync/reconcile (with idempotency check)
        String exerciseId = UUID.randomUUID().toString();
        String syncBody = """
                {
                  "deviceId": "emu-dev-1",
                  "items": [
                    {
                      "entityType": "DAILY_ACTIVITY",
                      "clientId": "2026-11-10|Asia/Ho_Chi_Minh",
                      "payload": {
                        "activityDate": "2026-11-10",
                        "timezoneId": "Asia/Ho_Chi_Minh",
                        "steps": 6200,
                        "distanceM": 4800.0,
                        "calories": 280.0,
                        "activeMinutes": 48,
                        "updatedAt": "2026-11-10T12:00:00Z"
                      }
                    },
                    {
                      "entityType": "EXERCISE",
                      "clientId": "%s",
                      "payload": {
                        "id": "%s",
                        "type": "RUNNING",
                        "status": "FINISHED",
                        "startedAt": "2026-11-10T01:00:00Z",
                        "endedAt": "2026-11-10T01:30:00Z",
                        "pausedSeconds": 0,
                        "gpsPoints": [
                          { "seq": 0, "latitude": 10.77, "longitude": 106.70, "recordedAt": "2026-11-10T01:00:00Z" },
                          { "seq": 1, "latitude": 10.78, "longitude": 106.71, "recordedAt": "2026-11-10T01:30:00Z" }
                        ]
                      }
                    }
                  ]
                }
                """.formatted(exerciseId, exerciseId);

        mockMvc.perform(post("/api/sync/reconcile")
                        .header("Authorization", DEV_AUTH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(syncBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.results[0].status").value("CREATED"))
                .andExpect(jsonPath("$.data.results[1].status").value("CREATED"));

        // Duplicate reconcile returns DUPLICATE
        mockMvc.perform(post("/api/sync/reconcile")
                        .header("Authorization", DEV_AUTH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(syncBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.results[0].status").value("DUPLICATE"))
                .andExpect(jsonPath("$.data.results[1].status").value("DUPLICATE"));

        // 8. Weekly analytics aggregates synced steps & exercise in requested timezone
        mockMvc.perform(get("/api/analytics/weekly")
                        .header("Authorization", DEV_AUTH)
                        .param("weekStart", "2026-11-09")
                        .param("timezoneId", "Asia/Ho_Chi_Minh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSteps").value(6200))
                .andExpect(jsonPath("$.data.totalExerciseCount").value(1));

        // 9. Clean up account
        mockMvc.perform(delete("/api/users/me").header("Authorization", DEV_AUTH))
                .andExpect(status().isNoContent());
    }
}
