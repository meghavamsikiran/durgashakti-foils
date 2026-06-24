package com.durgashakti.auth.service;

import com.durgashakti.auth.dto.*;
import com.durgashakti.auth.repository.AuthCartRepository;
import com.durgashakti.auth.repository.PasswordResetRepository;
import com.durgashakti.auth.repository.AuthUserRepository;
import com.durgashakti.common.entity.Cart;
import com.durgashakti.common.entity.PasswordReset;
import com.durgashakti.common.entity.User;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.common.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Pattern GMAIL_PATTERN = Pattern.compile("^[a-zA-Z0-9._%+-]+@gmail\\.com$", Pattern.CASE_INSENSITIVE);

    private final AuthUserRepository userRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final AuthCartRepository cartRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;
    private final HttpClient httpClient;
    private final com.durgashakti.common.util.NotificationClient notificationClient;

    public AuthService(AuthUserRepository userRepository,
                       PasswordResetRepository passwordResetRepository,
                       AuthCartRepository cartRepository,
                       JwtUtil jwtUtil,
                       com.durgashakti.common.util.NotificationClient notificationClient) {
        this.userRepository = userRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.cartRepository = cartRepository;
        this.jwtUtil = jwtUtil;
        this.notificationClient = notificationClient;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Map<String, Object> register(RegisterRequest req) {
        if (!isValidGmail(req.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only valid @gmail.com accounts are permitted to register.");
        }
        if (userRepository.existsByEmailIgnoreCase(req.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Account already exists with given email.");
        }

        User user = new User();
        user.setEmail(req.getEmail().toLowerCase());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setFullName(req.getFullName());
        user.setPhone(req.getPhone());
        user.setRole("customer");
        user.setIsActive(true);
        user.setStatus("active");
        user.setPermissions(new HashMap<>());
        user.setWishlist(new ArrayList<>());
        user.setSavedCards(new ArrayList<>());
        user.setCreatedAt(OffsetDateTime.now());

        User savedUser = userRepository.save(user);

        // Create empty cart for new user
        Cart cart = new Cart();
        cart.setUserId(savedUser.getId());
        cart.setItems(new ArrayList<>());
        cart.setUpdatedAt(OffsetDateTime.now());
        cartRepository.save(cart);

        // Welcome Email
        log.info("Sending welcome email to {}", savedUser.getEmail());
        try {
            notificationClient.sendEmail(
                savedUser.getEmail(),
                "Welcome to Durga Shakti Foils!",
                "Hello " + savedUser.getFullName() + ",\n\nWelcome to Durga Shakti Foils! Your account has been successfully created.\n\nBest regards,\nDurga Shakti Foils Team"
            );
        } catch (Exception e) {
            log.error("Failed to trigger welcome email: {}", e.getMessage());
        }

        String token = jwtUtil.createAccessToken(savedUser.getId().toString(), savedUser.getEmail(), savedUser.getRole());
        return Map.of("token", token, "user", serializeUser(savedUser));
    }

    public Map<String, Object> login(LoginRequest req) {
        if (!isValidGmail(req.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only valid @gmail.com accounts are permitted to login.");
        }

        User user = userRepository.findByEmailIgnoreCase(req.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account doesnot exists with given username, you want to create ?"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Wrong username/password");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is disabled. Please contact support.");
        }

        String token = jwtUtil.createAccessToken(user.getId().toString(), user.getEmail(), user.getRole());
        return Map.of("token", token, "user", serializeUser(user));
    }

    public Map<String, Object> googleLogin(String googleAccessToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + googleAccessToken))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid Google access token");
            }
            // Parse response body manually or using a lightweight JSON tool
            String body = response.body();
            String email = extractJsonField(body, "email");
            String name = extractJsonField(body, "name");
            if (name == null || name.isEmpty()) {
                name = "Google User";
            }

            if (email == null || email.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Google account did not return a valid email address.");
            }
            if (!isValidGmail(email)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Only valid @gmail.com accounts are permitted to authenticate.");
            }

            Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
            User user;
            if (userOpt.isEmpty()) {
                user = new User();
                user.setEmail(email.toLowerCase());
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                user.setFullName(name);
                user.setPhone("");
                user.setRole("customer");
                user.setIsActive(true);
                user.setStatus("active");
                user.setPermissions(new HashMap<>());
                user.setWishlist(new ArrayList<>());
                user.setSavedCards(new ArrayList<>());
                user.setCreatedAt(OffsetDateTime.now());
                user = userRepository.save(user);

                // Create cart
                Cart cart = new Cart();
                cart.setUserId(user.getId());
                cart.setItems(new ArrayList<>());
                cart.setUpdatedAt(OffsetDateTime.now());
                cartRepository.save(cart);

                log.info("Sending Google registration welcome email to {}", email);
            } else {
                user = userOpt.get();
                if (!Boolean.TRUE.equals(user.getIsActive())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Account is disabled. Please contact support.");
                }
            }

            String token = jwtUtil.createAccessToken(user.getId().toString(), user.getEmail(), user.getRole());
            return Map.of("token", token, "user", serializeUser(user));

        } catch (Exception e) {
            if (e instanceof ApiException) {
                throw (ApiException) e;
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "Google authentication failed: " + e.getMessage());
        }
    }

    public Map<String, Object> getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return serializeUser(user);
    }

    public Map<String, Object> updateMe(UUID userId, RegisterRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getEmail() != null) {
            String newEmail = req.getEmail().toLowerCase();
            if (!isValidGmail(newEmail)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Only valid @gmail.com accounts are permitted.");
            }
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmailIgnoreCase(newEmail)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
            }
            user.setEmail(newEmail);
        }
        User updated = userRepository.save(user);
        return serializeUser(updated);
    }

    public void deleteMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(user);
    }

    public void changePassword(UUID userId, ChangePasswordRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Wrong current password");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        if (!isValidGmail(req.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only valid @gmail.com accounts are permitted.");
        }

        User user = userRepository.findByEmailIgnoreCase(req.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        // Generate 6 digit OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));
        OffsetDateTime expiry = OffsetDateTime.now().plusMinutes(15);

        PasswordReset pr = passwordResetRepository.findByEmail(user.getEmail())
                .orElse(new PasswordReset());
        pr.setEmail(user.getEmail());
        pr.setOtp(otp);
        pr.setExpiry(expiry);
        pr.setFailedAttempts(0);
        passwordResetRepository.save(pr);

        log.info("Sending OTP {} to email {}", otp, user.getEmail());
        try {
            notificationClient.sendEmail(
                user.getEmail(),
                "Password Reset OTP - Durga Shakti Foils",
                "Hello " + user.getFullName() + ",\n\nYour password reset OTP is: " + otp + "\nThis OTP is valid for 15 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nDurga Shakti Foils Team"
            );
        } catch (Exception e) {
            log.error("Failed to trigger password reset OTP email: {}", e.getMessage());
        }
    }

    public void resetPassword(ResetPasswordRequest req) {
        PasswordReset pr = passwordResetRepository.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired OTP"));

        if (pr.getFailedAttempts() >= 5) {
            passwordResetRepository.delete(pr);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed attempts. Please request a new OTP.");
        }

        if (!pr.getOtp().equals(req.getOtp())) {
            pr.setFailedAttempts(pr.getFailedAttempts() + 1);
            passwordResetRepository.save(pr);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired OTP");
        }

        if (OffsetDateTime.now().isAfter(pr.getExpiry())) {
            passwordResetRepository.delete(pr);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP has expired");
        }

        User user = userRepository.findByEmailIgnoreCase(req.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        passwordResetRepository.delete(pr);
    }

    private boolean isValidGmail(String email) {
        return email != null && GMAIL_PATTERN.matcher(email).matches();
    }

    private Map<String, Object> serializeUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId().toString());
        map.put("email", user.getEmail());
        map.put("full_name", user.getFullName());
        map.put("phone", user.getPhone());
        map.put("role", user.getRole());
        map.put("status", user.getStatus());
        map.put("is_active", user.getIsActive());
        map.put("permissions", user.getPermissions());
        map.put("wishlist", user.getWishlist());
        map.put("created_at", user.getCreatedAt().toString());
        return map;
    }

    private String extractJsonField(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + field + "\":\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}
