package com.durgashakti.admin.service;

import com.durgashakti.admin.repository.AuditLogRepository;
import com.durgashakti.common.entity.AuditLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository auditLogRepository;
    private final com.durgashakti.admin.repository.AdminUserRepository userRepository;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           com.durgashakti.admin.repository.AdminUserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    public void logAction(String action, String targetType, String targetId, Map<String, Object> details) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setAction(action);
            auditLog.setTargetType(targetType != null ? targetType : "system");
            auditLog.setTargetId(targetId != null ? targetId : "N/A");

            Map<String, Object> metadata = details != null ? new HashMap<>(details) : new HashMap<>();

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String identifier = String.valueOf(auth.getPrincipal());
                if (identifier.equals(auth.getCredentials()) || "anonymousUser".equals(identifier)) {
                    identifier = auth.getName();
                }

                com.durgashakti.common.entity.User actorUser = null;
                if (identifier != null && !identifier.isBlank()) {
                    try {
                        actorUser = userRepository.findById(java.util.UUID.fromString(identifier)).orElse(null);
                    } catch (Exception ignored) {
                        List<com.durgashakti.common.entity.User> matches = userRepository.findByRoleIn(List.of("admin", "SUPER_ADMIN", "customer"));
                        for (com.durgashakti.common.entity.User u : matches) {
                            if (identifier.equalsIgnoreCase(u.getEmail()) || identifier.equalsIgnoreCase(u.getId().toString())) {
                                actorUser = u;
                                break;
                            }
                        }
                    }
                }

                if (actorUser != null) {
                    auditLog.setActorId(actorUser.getId().toString());
                    metadata.put("actor_email", actorUser.getEmail());
                    metadata.put("actor_name", actorUser.getFullName() != null ? actorUser.getFullName() : actorUser.getEmail());
                    metadata.put("actor_role", actorUser.getRole() != null ? actorUser.getRole() : "ADMIN");
                    metadata.put("actor_role_label", normalizeRoleLabel(actorUser.getRole()));
                } else {
                    auditLog.setActorId(identifier != null ? identifier : "ADMIN_USER");
                    metadata.putIfAbsent("actor_name", identifier != null ? identifier : "Admin User");
                    metadata.putIfAbsent("actor_email", identifier != null ? identifier : "admin@durgashakti.com");
                    metadata.putIfAbsent("actor_role", "ADMIN");
                    metadata.putIfAbsent("actor_role_label", "ADMIN");
                }
            } else {
                auditLog.setActorId("SYSTEM_PROCESS");
                metadata.putIfAbsent("actor_name", "System Process");
                metadata.putIfAbsent("actor_email", "system@durgashakti.com");
                metadata.putIfAbsent("actor_role", "SYSTEM");
                metadata.putIfAbsent("actor_role_label", "SYSTEM");
            }

            auditLog.setMetadata(metadata);
            auditLog.setCreatedAt(OffsetDateTime.now());
            auditLogRepository.save(auditLog);
            log.info("Audit log recorded successfully: action={}, targetType={}, targetId={}", action, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to persist audit log for action {}", action, e);
        }
    }

    private String normalizeRoleLabel(String role) {
        if (role == null) return "ADMIN";
        if ("SUPER_ADMIN".equalsIgnoreCase(role)) return "SUPER ADMIN";
        if ("admin".equalsIgnoreCase(role)) return "ADMIN";
        if ("customer".equalsIgnoreCase(role)) return "CUSTOMER";
        return role.toUpperCase();
    }
}
