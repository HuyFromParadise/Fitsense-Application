package com.example.fitsense.auth;

import java.util.Locale;
import org.springframework.core.env.Environment;

/**
 * How the backend authenticates incoming requests.
 *
 * <p>Resolution order:
 * <ol>
 *   <li>Use {@code fitsense.auth.mode} when it is set to {@code dev} or {@code firebase}.</li>
 *   <li>Otherwise use {@code dev} when the {@code dev} profile is active, else {@code firebase}.</li>
 * </ol>
 */
public enum AuthMode {
    DEV,
    FIREBASE;

    public String externalName() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static AuthMode resolve(String configured, Environment environment) {
        if (configured != null && !configured.isBlank()) {
            String value = configured.trim().toLowerCase(Locale.ROOT);
            return switch (value) {
                case "dev" -> DEV;
                case "firebase" -> FIREBASE;
                default -> throw new IllegalArgumentException(
                        "Unknown fitsense.auth.mode '" + configured + "' (expected dev or firebase)");
            };
        }
        return environment.matchesProfiles("dev") ? DEV : FIREBASE;
    }
}
