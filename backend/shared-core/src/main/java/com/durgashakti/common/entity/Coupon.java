package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Coupons table — discount coupons with usage tracking and targeting.
 */
@Entity
@Table(name = "coupons", indexes = {
        @Index(name = "ix_coupons_code", columnList = "code")
})
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 100, unique = true, nullable = false)
    private String code;

    @Column(name = "discount_type", length = 50, nullable = false)
    private String discountType;

    @Column(name = "discount_value", precision = 12, scale = 2, nullable = false)
    private BigDecimal discountValue;

    @Column(name = "expiry_date")
    private OffsetDateTime expiryDate;

    @Column(name = "min_cart_value", precision = 12, scale = 2, nullable = false)
    private BigDecimal minCartValue = BigDecimal.ZERO;

    @Column(name = "max_discount_limit", precision = 12, scale = 2)
    private BigDecimal maxDiscountLimit;

    @Column(name = "max_usage_count")
    private Integer maxUsageCount;

    @Column(name = "per_customer_usage_limit")
    private Integer perCustomerUsageLimit;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "total_uses", nullable = false)
    private Integer totalUses = 0;

    @Column(name = "total_discount_given", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalDiscountGiven = BigDecimal.ZERO;

    @Column(name = "revenue_generated", precision = 12, scale = 2, nullable = false)
    private BigDecimal revenueGenerated = BigDecimal.ZERO;

    @Column(name = "coupon_type", length = 50, nullable = false)
    private String couponType = "standard";

    @Column(name = "apply_to_all_loyal_customers", nullable = false)
    private Boolean applyToAllLoyalCustomers = false;

    @Column(name = "apply_to_all_products", nullable = false)
    private Boolean applyToAllProducts = false;

    @Type(JsonType.class)
    @Column(name = "eligible_customer_ids", columnDefinition = "jsonb", nullable = false)
    private List<String> eligibleCustomerIds = new ArrayList<>();

    @Type(JsonType.class)
    @Column(name = "eligible_product_ids", columnDefinition = "jsonb", nullable = false)
    private List<String> eligibleProductIds = new ArrayList<>();

    @Type(JsonType.class)
    @Column(name = "eligible_category_ids", columnDefinition = "jsonb", nullable = false)
    private List<String> eligibleCategoryIds = new ArrayList<>();

    @Column(name = "is_reusable", nullable = false)
    private Boolean isReusable = true;

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

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }

    public OffsetDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(OffsetDateTime expiryDate) { this.expiryDate = expiryDate; }

    public BigDecimal getMinCartValue() { return minCartValue; }
    public void setMinCartValue(BigDecimal minCartValue) { this.minCartValue = minCartValue; }

    public BigDecimal getMaxDiscountLimit() { return maxDiscountLimit; }
    public void setMaxDiscountLimit(BigDecimal maxDiscountLimit) { this.maxDiscountLimit = maxDiscountLimit; }

    public Integer getMaxUsageCount() { return maxUsageCount; }
    public void setMaxUsageCount(Integer maxUsageCount) { this.maxUsageCount = maxUsageCount; }

    public Integer getPerCustomerUsageLimit() { return perCustomerUsageLimit; }
    public void setPerCustomerUsageLimit(Integer perCustomerUsageLimit) { this.perCustomerUsageLimit = perCustomerUsageLimit; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getTotalUses() { return totalUses; }
    public void setTotalUses(Integer totalUses) { this.totalUses = totalUses; }

    public BigDecimal getTotalDiscountGiven() { return totalDiscountGiven; }
    public void setTotalDiscountGiven(BigDecimal totalDiscountGiven) { this.totalDiscountGiven = totalDiscountGiven; }

    public BigDecimal getRevenueGenerated() { return revenueGenerated; }
    public void setRevenueGenerated(BigDecimal revenueGenerated) { this.revenueGenerated = revenueGenerated; }

    public String getCouponType() { return couponType; }
    public void setCouponType(String couponType) { this.couponType = couponType; }

    public Boolean getApplyToAllLoyalCustomers() { return applyToAllLoyalCustomers; }
    public void setApplyToAllLoyalCustomers(Boolean applyToAllLoyalCustomers) { this.applyToAllLoyalCustomers = applyToAllLoyalCustomers; }

    public Boolean getApplyToAllProducts() { return applyToAllProducts; }
    public void setApplyToAllProducts(Boolean applyToAllProducts) { this.applyToAllProducts = applyToAllProducts; }

    public List<String> getEligibleCustomerIds() { return eligibleCustomerIds; }
    public void setEligibleCustomerIds(List<String> eligibleCustomerIds) { this.eligibleCustomerIds = eligibleCustomerIds; }

    public List<String> getEligibleProductIds() { return eligibleProductIds; }
    public void setEligibleProductIds(List<String> eligibleProductIds) { this.eligibleProductIds = eligibleProductIds; }

    public List<String> getEligibleCategoryIds() { return eligibleCategoryIds; }
    public void setEligibleCategoryIds(List<String> eligibleCategoryIds) { this.eligibleCategoryIds = eligibleCategoryIds; }

    public Boolean getIsReusable() { return isReusable; }
    public void setIsReusable(Boolean isReusable) { this.isReusable = isReusable; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
