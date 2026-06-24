package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Products table — product catalog.
 */
@Entity
@Table(name = "products", indexes = {
        @Index(name = "ix_products_name", columnList = "name"),
        @Index(name = "ix_products_category", columnList = "category"),
        @Index(name = "ix_products_batch_no", columnList = "batch_no"),
        @Index(name = "ix_products_variant_sku", columnList = "variant_sku"),
        @Index(name = "ix_products_stock", columnList = "stock_quantity")
})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 255, nullable = false)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(length = 50)
    private String size;

    @Column(length = 50)
    private String thickness;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal price;

    @Column(name = "discount_price", precision = 12, scale = 2)
    private BigDecimal discountPrice;

    @Column(length = 100)
    private String badge;

    @Column(name = "image_url", columnDefinition = "text")
    private String imageUrl;

    @Type(JsonType.class)
    @Column(name = "media_urls", columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> mediaUrls = new ArrayList<>();

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Object> features = new ArrayList<>();

    @Column(name = "in_stock", nullable = false)
    private Boolean inStock = true;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    @Column(name = "units_sold", nullable = false)
    private Integer unitsSold = 0;

    @Column(name = "low_stock_threshold", nullable = false)
    private Integer lowStockThreshold = 20;

    @Column(length = 100)
    private String category;

    @Column(name = "batch_no", length = 100)
    private String batchNo;

    @Column(length = 50)
    private String width = "295mm";

    @Column(name = "base_name", length = 255)
    private String baseName;

    @Column(name = "variant_sku", length = 100)
    private String variantSku;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", columnDefinition = "uuid")
    private UUID createdBy;

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

    // ── Getters & Setters ──
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public String getThickness() { return thickness; }
    public void setThickness(String thickness) { this.thickness = thickness; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getDiscountPrice() { return discountPrice; }
    public void setDiscountPrice(BigDecimal discountPrice) { this.discountPrice = discountPrice; }
    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public List<Map<String, Object>> getMediaUrls() { return mediaUrls; }
    public void setMediaUrls(List<Map<String, Object>> mediaUrls) { this.mediaUrls = mediaUrls; }
    public List<Object> getFeatures() { return features; }
    public void setFeatures(List<Object> features) { this.features = features; }
    public Boolean getInStock() { return inStock; }
    public void setInStock(Boolean inStock) { this.inStock = inStock; }
    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    public Integer getUnitsSold() { return unitsSold; }
    public void setUnitsSold(Integer unitsSold) { this.unitsSold = unitsSold; }
    public Integer getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(Integer lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getBatchNo() { return batchNo; }
    public void setBatchNo(String batchNo) { this.batchNo = batchNo; }
    public String getWidth() { return width; }
    public void setWidth(String width) { this.width = width; }
    public String getBaseName() { return baseName; }
    public void setBaseName(String baseName) { this.baseName = baseName; }
    public String getVariantSku() { return variantSku; }
    public void setVariantSku(String variantSku) { this.variantSku = variantSku; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
