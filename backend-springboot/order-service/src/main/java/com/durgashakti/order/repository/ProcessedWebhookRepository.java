package com.durgashakti.order.repository;

import com.durgashakti.common.entity.ProcessedWebhook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedWebhookRepository extends JpaRepository<ProcessedWebhook, String> {
    boolean existsByEventId(String eventId);
}
