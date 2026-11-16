package com.example.fitsense.auth.filter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Public health endpoint should be accessible without credentials")
    void publicHealthEndpoint_allowsAnonymous() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Protected endpoint should return 401 when no token is provided")
    void protectedEndpoint_rejectsMissingToken() throws Exception {
        mockMvc.perform(get("/api/ping-auth"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Protected endpoint should return 401 when an invalid token is provided")
    void protectedEndpoint_rejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/ping-auth")
                        .header("Authorization", "Bearer invalid-secret-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Protected endpoint should return 200 when valid dev token is provided")
    void protectedEndpoint_acceptsValidDevToken() throws Exception {
        mockMvc.perform(get("/api/ping-auth")
                        .header("Authorization", "Bearer dev-token"))
                .andExpect(status().isOk());
    }
}
