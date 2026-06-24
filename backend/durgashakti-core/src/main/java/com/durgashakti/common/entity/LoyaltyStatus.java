package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Loyalty status table — user loyalty tier and accumulated points.
 */
@Entity
@Table(name = "loyalty_status")
public class LoyaltyStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", unique = true, nullable = false)
    private UUID userId;

    @Column(name = "total_points", nullable = false)
    private Integer totalPoints = 0;

    @Column(length = 50, nullable = false)
    private String tier = "bronze";

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Integer getTotalPoints() { return totalPoints; }
    public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
