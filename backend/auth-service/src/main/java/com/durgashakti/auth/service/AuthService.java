package com.durgashakti.auth.service;

import com.durgashakti.auth.dto.*;
import java.util.Map;
import java.util.UUID;

public interface AuthService {
    Map<String, Object> register(RegisterRequest req);
    Map<String, Object> login(LoginRequest req);
    Map<String, Object> googleLogin(String googleAccessToken, String action);
    Map<String, Object> getMe(UUID userId);
    Map<String, Object> updateMe(UUID userId, UpdateProfileRequest req);
    void deleteMe(UUID userId);
    void changePassword(UUID userId, ChangePasswordRequest req);
    void forgotPassword(ForgotPasswordRequest req);
    void resetPassword(ResetPasswordRequest req);
}
