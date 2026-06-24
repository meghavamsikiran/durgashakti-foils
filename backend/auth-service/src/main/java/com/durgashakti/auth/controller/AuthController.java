package com.durgashakti.auth.controller;

import com.durgashakti.auth.dto.*;
import com.durgashakti.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/auth/google")
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestBody Map<String, String> payload) {
        String accessToken = payload.get("access_token");
        return ResponseEntity.ok(authService.googleLogin(accessToken));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> getMe(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(authService.getMe(userId));
    }

    @PutMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> updateMe(@RequestBody RegisterRequest req, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(authService.updateMe(userId, req));
    }

    @DeleteMapping("/auth/me")
    public ResponseEntity<Map<String, String>> deleteMe(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        authService.deleteMe(userId);
        return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
    }

    @PostMapping("/auth/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                                              Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        authService.changePassword(userId, req);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully to email"));
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", "Password reset successful. You can now login with your new password."));
    }
}
