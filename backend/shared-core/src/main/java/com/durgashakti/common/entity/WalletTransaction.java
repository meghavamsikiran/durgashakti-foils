package com.durgashakti.common.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "wallet_transactions", indexes = {
        @Index(name = "ix_wallet_tx_user_id", columnList = "user_id")
})
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(length = 20, nullable = false)
    private String type; // 'CREDIT', 'DEBIT'

    @Column(length = 50, nullable = false)
    private String source; // 'TOPUP', 'VOUCHER', 'ORDER_PAYMENT', 'ORDER_REFUND', 'ADMIN_CREDIT'

    @Column(name = "reference_id", length = 255)
    private String referenceId; // orderId, razorpayPaymentId, or voucherCode

    @Column(length = 500)
    private String description;

    @Column(length = 20, nullable = false)
    private String status = "SUCCESS"; // 'SUCCESS', 'PENDING', 'FAILED'

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public WalletTransaction() {}

    public WalletTransaction(UUID userId, BigDecimal amount, String type, String source, String referenceId, String description, String status) {
        this.userId = userId;
        this.amount = amount;
        this.type = type;
        this.source = source;
        this.referenceId = referenceId;
        this.description = description;
        this.status = status != null ? status : "SUCCESS";
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
