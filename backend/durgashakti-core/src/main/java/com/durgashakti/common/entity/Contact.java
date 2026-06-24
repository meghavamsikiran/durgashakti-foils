package com.durgashakti.common.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Contacts table — customer contact form submissions.
 */
@Entity
@Table(name = "contacts", indexes = {
        @Index(name = "ix_contacts_created_at", columnList = "created_at")
})
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 255, nullable = false)
    private String name;

    @Column(length = 255, nullable = false)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(columnDefinition = "text", nullable = false)
    private String message;

    @Column(length = 50, nullable = false)
    private String status = "pending";

    @Column(name = "reply_message", columnDefinition = "text")
    private String replyMessage;

    @Column(name = "replied_at")
    private OffsetDateTime repliedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReplyMessage() { return replyMessage; }
    public void setReplyMessage(String replyMessage) { this.replyMessage = replyMessage; }

    public OffsetDateTime getRepliedAt() { return repliedAt; }
    public void setRepliedAt(OffsetDateTime repliedAt) { this.repliedAt = repliedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
