package com.durgashakti.order.repository;

import com.durgashakti.common.entity.ProcessedWebhook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProcessedWebhookRepository extends JpaRepository<ProcessedWebhook, UUID> {
    boolean existsByWebhookId(String webhookId);
}
