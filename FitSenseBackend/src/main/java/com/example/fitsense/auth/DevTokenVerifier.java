package com.example.fitsense.auth;

import com.example.fitsense.common.security.CurrentUser;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import org.springframework.security.authentication.BadCredentialsException;

/**
 * Local development verifier:
 * 1. Accepts the configured static dev token (e.g. "dev-token").
 * 2. Or, if received a real JWT (e.g. from Firebase Auth on mobile), decodes the payload
 *    so local development works seamlessly with both mock tokens and real mobile login.
 */
public final class DevTokenVerifier implements TokenVerifier {

    private final String devToken;
    private final JsonMapper jsonMapper = new JsonMapper();

    public DevTokenVerifier(String devToken) {
        this.devToken = devToken == null ? "" : devToken;
    }

    @Override
    public CurrentUser verify(String token) {
        if (token == null || token.isBlank()) {
            throw new BadCredentialsException("Empty token");
        }

        // 1. Check static dev token match
        boolean matches = MessageDigest.isEqual(
                devToken.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8));
        if (matches) {
            return new CurrentUser("dev-user", "dev@fitsense.local");
        }

        // 2. Fallback: Parse JWT payload (Firebase ID token from real mobile login)
        String[] parts = token.split("\\.");
        if (parts.length == 3) {
            try {
                byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
                JsonNode node = jsonMapper.readTree(decodedBytes);
                String uid = node.hasNonNull("user_id") ? node.get("user_id").asText()
                        : node.hasNonNull("sub") ? node.get("sub").asText() : null;
                String email = node.hasNonNull("email") ? node.get("email").asText()
                        : (uid != null ? uid + "@fitsense.local" : null);

                if (uid != null && !uid.isBlank()) {
                    return new CurrentUser(uid, email);
                }
            } catch (Exception ignored) {
                // Not a valid JWT payload
            }
        }

        throw new BadCredentialsException("Invalid dev token");
    }
}
