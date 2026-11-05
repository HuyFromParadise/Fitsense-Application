package com.example.fitsense.auth;

import com.example.fitsense.auth.filter.FirebaseAuthenticationFilter;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class AuthConfig {

    @Bean
    public AuthMode authMode(
            @Value("${fitsense.auth.mode:}") String configuredMode,
            Environment environment
    ) {
        return AuthMode.resolve(configuredMode, environment);
    }

    @Bean
    public TokenVerifier tokenVerifier(
            AuthMode authMode,
            @Value("${fitsense.auth.dev-token:dev-token}") String devToken,
            ObjectProvider<FirebaseApp> firebaseAppProvider
    ) {
        if (authMode == AuthMode.DEV) {
            return new DevTokenVerifier(devToken);
        }

        FirebaseApp firebaseApp = firebaseAppProvider.getIfAvailable();
        if (firebaseApp == null) {
            throw new IllegalStateException(
                    "fitsense.auth.mode=firebase requires Firebase credentials. Set "
                            + "FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON or "
                            + "GOOGLE_APPLICATION_CREDENTIALS, or run with the dev profile.");
        }
        return new FirebaseTokenVerifier(FirebaseAuth.getInstance(firebaseApp));
    }

    @Bean
    public FirebaseAuthenticationFilter firebaseAuthenticationFilter(TokenVerifier tokenVerifier) {
        return new FirebaseAuthenticationFilter(tokenVerifier);
    }
}
