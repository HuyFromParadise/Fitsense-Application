package com.example.fitsense.auth;

import com.example.fitsense.common.security.CurrentUser;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

/** Verifies Firebase ID tokens with the Admin SDK. */
public final class FirebaseTokenVerifier implements TokenVerifier {

    private final FirebaseAuth firebaseAuth;

    public FirebaseTokenVerifier(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    public CurrentUser verify(String token) throws Exception {
        FirebaseToken decoded = firebaseAuth.verifyIdToken(token);
        return new CurrentUser(decoded.getUid(), decoded.getEmail());
    }
}
