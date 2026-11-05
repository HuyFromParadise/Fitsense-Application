package com.example.fitsense.config;

import com.example.fitsense.auth.AuthMode;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Initializes the Firebase Admin SDK only when {@code fitsense.auth.mode=firebase}.
 * In the dev profile this configuration is skipped entirely, so the backend can
 * start without any Firebase credentials.
 */
@Configuration
@Conditional(FirebaseConfig.FirebaseModeCondition.class)
public class FirebaseConfig {

    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @Value("${firebase.service-account-json:}")
    private String serviceAccountJson;

    @Value("${firebase.project-id:}")
    private String projectId;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        FirebaseOptions.Builder options = FirebaseOptions.builder()
                .setCredentials(loadCredentials());
        if (StringUtils.hasText(projectId)) {
            options.setProjectId(projectId);
        }
        return FirebaseApp.initializeApp(options.build());
    }

    private GoogleCredentials loadCredentials() throws IOException {
        if (StringUtils.hasText(serviceAccountJson)) {
            try (InputStream in = new ByteArrayInputStream(
                    serviceAccountJson.getBytes(StandardCharsets.UTF_8))) {
                return GoogleCredentials.fromStream(in);
            }
        }
        if (StringUtils.hasText(serviceAccountPath)) {
            try (InputStream in = new FileInputStream(serviceAccountPath)) {
                return GoogleCredentials.fromStream(in);
            }
        }
        return GoogleCredentials.getApplicationDefault();
    }

    public static class FirebaseModeCondition implements Condition {

        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            String configured = context.getEnvironment().getProperty("fitsense.auth.mode", "");
            return AuthMode.resolve(configured, context.getEnvironment()) == AuthMode.FIREBASE;
        }
    }
}
