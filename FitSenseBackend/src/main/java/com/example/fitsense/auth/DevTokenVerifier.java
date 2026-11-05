package com.example.fitsense.auth;

import com.example.fitsense.common.security.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.security.authentication.BadCredentialsException;

/** Local-only verifier: accepts the configured static dev token. */
public final class DevTokenVerifier implements TokenVerifier {

    private final String devToken;

    public DevTokenVerifier(String devToken) {
        this.devToken = devToken == null ? "" : devToken;
    }

    @Override
    public CurrentUser verify(String token) {
        boolean matches = MessageDigest.isEqual(
                devToken.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            throw new BadCredentialsException("Invalid dev token");
        }
        return new CurrentUser("dev-user", "dev@fitsense.local");
    }
}
