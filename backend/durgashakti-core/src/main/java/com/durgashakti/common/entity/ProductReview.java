package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Product reviews table — customer reviews with moderation and admin reply.
 */
@Entity
@Table(name = "product_reviews",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_product_reviews_product_user_order",
                        columnNames = {"product_id", "user_id", "order_id"})
        },
        indexes = {
                @Index(name = "ix_product_reviews_product_id", columnList = "product_id"),
                @Index(name = "ix_product_reviews_user_id", columnList = "user_id"),
                @Index(name = "ix_product_reviews_order_id", columnList = "order_id"),
                @Index(name = "ix_product_reviews_status", columnList = "status"),
                @Index(name = "ix_product_reviews_created_at", columnList = "created_at")
        })
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "product_id", columnDefinition = "uuid", nullable = false)
    private UUID productId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "order_id", columnDefinition = "uuid", nullable = false)
    private UUID orderId;

    @Column(nullable = false)
    private Integer rating;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "public_name", length = 255)
    private String publicName;

    @Type(JsonType.class)
    @Column(name = "media_urls", columnDefinition = "jsonb", nullable = false)
    private List<String> mediaUrls = new ArrayList<>();

    @Column(length = 50, nullable = false)
    private String status = "published";

    @Column(name = "admin_reply", columnDefinition = "text")
    private String adminReply;

    @Column(name = "admin_reply_by", columnDefinition = "uuid")
    private UUID adminReplyBy;

    @Column(name = "admin_reply_at")
    private OffsetDateTime adminReplyAt;

    @Column(name = "helpful_count", nullable = false)
    private Integer helpfulCount = 0;

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

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getPublicName() { return publicName; }
    public void setPublicName(String publicName) { this.publicName = publicName; }

    public List<String> getMediaUrls() { return mediaUrls; }
    public void setMediaUrls(List<String> mediaUrls) { this.mediaUrls = mediaUrls; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminReply() { return adminReply; }
    public void setAdminReply(String adminReply) { this.adminReply = adminReply; }

    public UUID getAdminReplyBy() { return adminReplyBy; }
    public void setAdminReplyBy(UUID adminReplyBy) { this.adminReplyBy = adminReplyBy; }

    public OffsetDateTime getAdminReplyAt() { return adminReplyAt; }
    public void setAdminReplyAt(OffsetDateTime adminReplyAt) { this.adminReplyAt = adminReplyAt; }

    public Integer getHelpfulCount() { return helpfulCount; }
    public void setHelpfulCount(Integer helpfulCount) { this.helpfulCount = helpfulCount; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
