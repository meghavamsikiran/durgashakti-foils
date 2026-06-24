package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Users table — customers, admins, super-admins.
 */
@Entity
@Table(name = "users", indexes = {
        @Index(name = "ix_users_email", columnList = "email"),
        @Index(name = "ix_users_role", columnList = "role")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 255, unique = true, nullable = false)
    private String email;

    @Column(length = 255, nullable = false)
    private String password;

    @Column(name = "full_name", length = 255, nullable = false)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Column(length = 50, nullable = false)
    private String role = "customer";

    @Column(length = 20, nullable = false)
    private String status = "active";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> permissions = new HashMap<>();

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Object> wishlist = new ArrayList<>();

    @Type(JsonType.class)
    @Column(name = "saved_cards", columnDefinition = "jsonb", nullable = false)
    private List<Object> savedCards = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Map<String, Object> getPermissions() { return permissions; }
    public void setPermissions(Map<String, Object> permissions) { this.permissions = permissions; }

    public List<Object> getWishlist() { return wishlist; }
    public void setWishlist(List<Object> wishlist) { this.wishlist = wishlist; }

    public List<Object> getSavedCards() { return savedCards; }
    public void setSavedCards(List<Object> savedCards) { this.savedCards = savedCards; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
