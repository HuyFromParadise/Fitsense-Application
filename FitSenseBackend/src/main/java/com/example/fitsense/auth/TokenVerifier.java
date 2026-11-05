package com.example.fitsense.auth;

import com.example.fitsense.common.security.CurrentUser;

/** Verifies the bearer token of an incoming request and maps it to the current user. */
public interface TokenVerifier {

    CurrentUser verify(String token) throws Exception;
}
