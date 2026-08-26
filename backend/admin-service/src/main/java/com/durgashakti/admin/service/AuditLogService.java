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
import java.util.Map;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
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
                String name = auth.getName();
                auditLog.setActorId(name);
                metadata.putIfAbsent("actor_email", name);
                metadata.putIfAbsent("actor_name", name);
                metadata.putIfAbsent("actor_role", auth.getAuthorities() != null ? auth.getAuthorities().toString() : "ADMIN");
            } else {
                auditLog.setActorId("SYSTEM_PROCESS");
                metadata.putIfAbsent("actor_name", "System Process");
                metadata.putIfAbsent("actor_role", "SYSTEM");
            }

            auditLog.setMetadata(metadata);
            auditLog.setCreatedAt(OffsetDateTime.now());
            auditLogRepository.save(auditLog);
            log.info("Audit log recorded successfully: action={}, targetType={}, targetId={}", action, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to persist audit log for action {}", action, e);
        }
    }
}
