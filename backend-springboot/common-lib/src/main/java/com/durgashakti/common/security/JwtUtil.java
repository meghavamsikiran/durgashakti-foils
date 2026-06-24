package com.durgashakti.common.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT utility — token creation and validation.
 * Mirrors the Python create_token / decode_token helpers exactly.
 */
@Component
public class JwtUtil {

    private final SecretKey signingKey;
    private final long accessTokenMs;
    private final long refreshTokenMs;

    public JwtUtil(
            @Value("${jwt.secret:YOUR_STRONG_RANDOM_JWT_SECRET_MIN_48_CHARS}") String secret,
            @Value("${jwt.access-token-minutes:30}") long accessMinutes,
            @Value("${jwt.refresh-token-days:7}") long refreshDays) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenMs = accessMinutes * 60 * 1000;
        this.refreshTokenMs = refreshDays * 24 * 3600 * 1000;
    }

    /** Create an access token (short-lived). */
    public String createAccessToken(String userId, String email, String role) {
        return buildToken(userId, email, role, accessTokenMs);
    }

    /** Create a refresh token (long-lived). */
    public String createRefreshToken(String userId, String email, String role) {
        return buildToken(userId, email, role, refreshTokenMs);
    }

    private String buildToken(String userId, String email, String role, long ttlMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("user_id", userId);
        claims.put("email", email);
        claims.put("role", role);

        return Jwts.builder()
                .claims(claims)
                .subject(userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(signingKey)
                .compact();
    }

    /** Validate and parse a JWT token. Returns the claims map. */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        String userId = claims.get("user_id", String.class);
        return userId != null ? userId : claims.getSubject();
    }

    public String getEmailFromToken(String token) {
        return parseToken(token).get("email", String.class);
    }

    public String getRoleFromToken(String token) {
        return parseToken(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
