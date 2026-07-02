package com.durgashakti.admin.controller;

import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.common.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

import com.durgashakti.common.util.EmailClient;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final AdminUserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailClient emailClient;

    public SuperAdminController(AdminUserRepository userRepository, EmailClient emailClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.emailClient = emailClient;
    }

    @GetMapping("/admins")
    public ResponseEntity<List<Map<String, Object>>> listAdminUsers() {
        List<User> users = userRepository.findByRoleIn(List.of("admin", "SUPER_ADMIN"));
        List<Map<String, Object>> response = new ArrayList<>();
        for (User u : users) {
            response.add(prepareAdminUser(u));
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admins")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> createAdminUser(@RequestBody Map<String, Object> req) {
        String email = (String) req.get("email");
        String password = (String) req.get("password");
        String fullName = (String) req.get("full_name");
        String phone = (String) req.get("phone");
        String roleTemplate = (String) req.get("role_template");
        Map<String, Object> permissions = (Map<String, Object>) req.get("permissions");

        if (email == null || email.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        List<User> existing = userRepository.findByRoleIn(List.of("admin", "SUPER_ADMIN", "customer"));
        for (User u : existing) {
            if (email.equalsIgnoreCase(u.getEmail())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
            }
        }

        User u = new User();
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));
        u.setFullName(fullName != null ? fullName : "Anonymous");
        u.setPhone(phone);
        u.setRole("admin");
        u.setIsActive(true);
        u.setStatus("active");

        Map<String, Object> permissionsDict = new HashMap<>(permissions != null ? permissions : Map.of());
        permissionsDict.put("role_template", normalizeRoleTemplate(roleTemplate));
        permissionsDict.put("is_first_login", true);
        u.setPermissions(permissionsDict);

        userRepository.save(u);
        
        try {
            emailClient.sendEmail(u.getEmail(), "Admin Account Created",
                "Hello " + u.getFullName() + ",\n\n" +
                "An admin account has been created for you at Durga Shakti Foils.\n" +
                "Your temporary password is: " + password + "\n\n" +
                "Please login and change it immediately.\n\n" +
                "Best regards,\nDurga Shakti Foils Admin Team");
        } catch (Exception e) {
            // Log silently or ignore if email fails
        }

        return ResponseEntity.ok(prepareAdminUser(u));
    }

    @PutMapping("/admins/{userId}/status")
    public ResponseEntity<?> toggleAdminStatus(@PathVariable("userId") UUID userId, @RequestBody Map<String, Object> req) {
        Optional<User> uOpt = userRepository.findById(userId);
        if (uOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User u = uOpt.get();
        Boolean isActive = (Boolean) req.get("is_active");
        if (isActive != null) {
            u.setIsActive(isActive);
            u.setStatus(isActive ? "active" : "inactive");
            userRepository.save(u);
        }
        return ResponseEntity.ok(prepareAdminUser(u));
    }

    @PutMapping("/admins/{userId}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> updateAdminUser(@PathVariable("userId") UUID userId, @RequestBody Map<String, Object> req) {
        Optional<User> uOpt = userRepository.findById(userId);
        if (uOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User u = uOpt.get();
        String fullName = (String) req.get("full_name");
        String phone = (String) req.get("phone");
        String roleTemplate = (String) req.get("role_template");
        Map<String, Object> permissions = (Map<String, Object>) req.get("permissions");

        if (fullName != null) u.setFullName(fullName);
        if (phone != null) u.setPhone(phone);

        Map<String, Object> permissionsDict = new HashMap<>(u.getPermissions() != null ? u.getPermissions() : Map.of());
        if (permissions != null) {
            permissionsDict.putAll(permissions);
        }
        if (roleTemplate != null) {
            permissionsDict.put("role_template", normalizeRoleTemplate(roleTemplate));
        }
        u.setPermissions(permissionsDict);

        userRepository.save(u);
        return ResponseEntity.ok(prepareAdminUser(u));
    }

    @DeleteMapping("/admins/{userId}")
    public ResponseEntity<?> deleteAdminUser(@PathVariable("userId") UUID userId) {
        Optional<User> uOpt = userRepository.findById(userId);
        if (uOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        userRepository.delete(uOpt.get());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/admins/{userId}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable("userId") UUID userId, @RequestBody Map<String, String> req) {
        Optional<User> uOpt = userRepository.findById(userId);
        if (uOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User u = uOpt.get();
        String password = req.get("password");
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password is required"));
        }
        u.setPassword(passwordEncoder.encode(password));
        userRepository.save(u);
        
        try {
            emailClient.sendEmail(u.getEmail(), "Admin Password Reset",
                "Hello " + u.getFullName() + ",\n\n" +
                "Your admin account password has been reset.\n" +
                "Your new temporary password is: " + password + "\n\n" +
                "Please login and change it immediately.\n\n" +
                "Best regards,\nDurga Shakti Foils Admin Team");
        } catch (Exception e) {
            // Log silently or ignore
        }
        
        return ResponseEntity.ok(Map.of("message", "Password reset successful"));
    }

    private Map<String, Object> prepareAdminUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId().toString());
        map.put("admin_id", user.getId().toString());
        map.put("email", user.getEmail());
        map.put("full_name", user.getFullName());
        map.put("phone", user.getPhone() != null ? user.getPhone() : "");
        map.put("role", user.getRole());
        map.put("is_active", user.getIsActive());
        map.put("status", user.getStatus());
        map.put("permissions", user.getPermissions());
        map.put("created_at", user.getCreatedAt() != null ? user.getCreatedAt().toString() : OffsetDateTime.now().toString());

        // permission count & role label
        map.put("permission_count", countPermissions(user.getPermissions()));
        map.put("role_label", getRoleLabel(user));

        return map;
    }

    private int countPermissions(Map<String, Object> permissions) {
        if (permissions == null) return 0;
        int count = 0;
        for (Map.Entry<String, Object> entry : permissions.entrySet()) {
            if (!List.of("role_template", "is_first_login").contains(entry.getKey())) {
                if (Boolean.TRUE.equals(entry.getValue())) {
                    count++;
                }
            }
        }
        return count;
    }

    private String getRoleLabel(User user) {
        if ("SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return "Super Admin";
        }
        Map<String, Object> perms = user.getPermissions();
        if (perms != null && perms.get("role_template") != null) {
            String template = String.valueOf(perms.get("role_template"));
            return normalizeRoleTemplateLabel(template);
        }
        return "Custom Admin";
    }

    private String normalizeRoleTemplate(String template) {
        if (template == null) return "custom";
        return template.trim().toUpperCase().replace(" ", "_");
    }

    private String normalizeRoleTemplateLabel(String template) {
        if (template == null) return "Custom Admin";
        String normalized = template.trim().toUpperCase().replace(" ", "_");
        switch (normalized) {
            case "OPERATIONS_ADMIN": return "Operations Admin";
            case "ORDER_MANAGER": return "Order Manager";
            case "PRODUCT_MANAGER": return "Product Manager";
            case "INVENTORY_MANAGER": return "Inventory Manager";
            case "CUSTOMER_SUPPORT": return "Customer Support";
            case "SHIPPING_MANAGER": return "Shipping Manager";
            case "FINANCE_ADMIN": return "Finance Admin";
            case "ANALYTICS_VIEWER": return "Analytics Viewer";
            default: return "Custom Admin";
        }
    }
}
