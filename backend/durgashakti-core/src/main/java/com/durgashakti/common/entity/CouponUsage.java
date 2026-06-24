package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Coupon usages table — tracks each coupon redemption per user/order.
 */
@Entity
@Table(name = "coupon_usages", indexes = {
        @Index(name = "ix_coupon_usages_coupon_id", columnList = "coupon_id"),
        @Index(name = "ix_coupon_usages_user_id", columnList = "user_id")
})
public class CouponUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "coupon_id", columnDefinition = "uuid", nullable = false)
    private UUID couponId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "order_id", columnDefinition = "uuid", nullable = false)
    private UUID orderId;

    @Column(name = "discount_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal discountAmount;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    @PrePersist
    protected void onCreate() {
        if (usedAt == null) usedAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCouponId() { return couponId; }
    public void setCouponId(UUID couponId) { this.couponId = couponId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public OffsetDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(OffsetDateTime usedAt) { this.usedAt = usedAt; }
}
