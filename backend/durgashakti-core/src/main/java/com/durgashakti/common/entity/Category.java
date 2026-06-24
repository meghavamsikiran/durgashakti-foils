package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Categories table — product categories with optional global discount.
 */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 255, unique = true, nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "global_discount_enabled", nullable = false)
    private Boolean globalDiscountEnabled = false;

    @Column(name = "global_discount_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal globalDiscountPercent = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getGlobalDiscountEnabled() { return globalDiscountEnabled; }
    public void setGlobalDiscountEnabled(Boolean globalDiscountEnabled) { this.globalDiscountEnabled = globalDiscountEnabled; }

    public BigDecimal getGlobalDiscountPercent() { return globalDiscountPercent; }
    public void setGlobalDiscountPercent(BigDecimal globalDiscountPercent) { this.globalDiscountPercent = globalDiscountPercent; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
