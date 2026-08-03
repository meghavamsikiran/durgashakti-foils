package com.durgashakti.common.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "wallet_vouchers", indexes = {
        @Index(name = "ix_wallet_vouchers_code", columnList = "code", unique = true)
})
public class WalletVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 100, unique = true, nullable = false)
    private String code;

    @Column(length = 255)
    private String title;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "assigned_user_id")
    private UUID assignedUserId;

    @Column(name = "assigned_user_email")
    private String assignedUserEmail;

    @Column(name = "is_redeemed", nullable = false)
    private Boolean isRedeemed = false;

    @Column(name = "redeemed_by_user_id")
    private UUID redeemedByUserId;

    @Column(name = "redeemed_at")
    private OffsetDateTime redeemedAt;

    @Column(name = "expiry_date")
    private OffsetDateTime expiryDate;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public WalletVoucher() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public UUID getAssignedUserId() { return assignedUserId; }
    public void setAssignedUserId(UUID assignedUserId) { this.assignedUserId = assignedUserId; }

    public String getAssignedUserEmail() { return assignedUserEmail; }
    public void setAssignedUserEmail(String assignedUserEmail) { this.assignedUserEmail = assignedUserEmail; }

    public Boolean getIsRedeemed() { return isRedeemed; }
    public void setIsRedeemed(Boolean isRedeemed) { this.isRedeemed = isRedeemed; }

    public UUID getRedeemedByUserId() { return redeemedByUserId; }
    public void setRedeemedByUserId(UUID redeemedByUserId) { this.redeemedByUserId = redeemedByUserId; }

    public OffsetDateTime getRedeemedAt() { return redeemedAt; }
    public void setRedeemedAt(OffsetDateTime redeemedAt) { this.redeemedAt = redeemedAt; }

    public OffsetDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(OffsetDateTime expiryDate) { this.expiryDate = expiryDate; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
