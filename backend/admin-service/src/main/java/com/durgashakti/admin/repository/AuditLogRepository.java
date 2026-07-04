package com.durgashakti.admin.repository;

import com.durgashakti.common.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    long countByActionIn(java.util.List<String> actions);
    long countByActionContainingIgnoreCase(String actionSub);
}
