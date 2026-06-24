package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

/**
 * Processed webhooks table — idempotency tracking for webhook events.
 */
@Entity
@Table(name = "processed_webhooks")
public class ProcessedWebhook {

    @Id
    @Column(name = "event_id", length = 255)
    private String eventId;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        if (processedAt == null) processedAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }
}
