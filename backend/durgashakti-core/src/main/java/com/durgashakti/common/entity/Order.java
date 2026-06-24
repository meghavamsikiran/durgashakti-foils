package com.durgashakti.common.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Orders table — customer orders with payment, shipping, and tracking info.
 */
@Entity
@Table(name = "orders", indexes = {
        @Index(name = "ix_orders_order_number", columnList = "order_number"),
        @Index(name = "ix_orders_user_id", columnList = "user_id"),
        @Index(name = "ix_orders_order_status", columnList = "order_status"),
        @Index(name = "ix_orders_created_at", columnList = "created_at"),
        @Index(name = "ix_orders_razorpay_order_id", columnList = "razorpay_order_id")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_number", length = 255, unique = true, nullable = false)
    private String orderNumber;

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> items = new ArrayList<>();

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @Type(JsonType.class)
    @Column(name = "coupon_codes", columnDefinition = "jsonb", nullable = false)
    private List<String> couponCodes = new ArrayList<>();

    @Column(name = "discount_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 100)
    private String paymentMethod;

    @Column(name = "payment_status", length = 50, nullable = false)
    private String paymentStatus = "pending";

    @Column(name = "order_status", length = 50, nullable = false)
    private String orderStatus = "processing";

    @Column(name = "stock_applied", nullable = false)
    private Boolean stockApplied = false;

    @Type(JsonType.class)
    @Column(name = "shipping_address", columnDefinition = "jsonb")
    private Map<String, Object> shippingAddress;

    @Column(name = "idempotency_key", length = 255, unique = true)
    private String idempotencyKey;

    @Column(name = "razorpay_order_id", length = 255)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 255)
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature", length = 255)
    private String razorpaySignature;

    @Column(length = 255)
    private String carrier;

    @Column(name = "tracking_id", length = 255)
    private String trackingId;

    @Column(name = "tracking_url", columnDefinition = "text")
    private String trackingUrl;

    @Column(name = "shipped_at")
    private OffsetDateTime shippedAt;

    @Column(name = "courier_name", length = 255)
    private String courierName;

    @Column(name = "tracking_number", length = 255)
    private String trackingNumber;

    @Column(name = "expected_delivery_date", length = 255)
    private String expectedDeliveryDate;

    @Column(name = "shipment_status", length = 100)
    private String shipmentStatus;

    @Column(name = "last_tracking_sync")
    private OffsetDateTime lastTrackingSync;

    @Type(JsonType.class)
    @Column(name = "tracking_events_json", columnDefinition = "jsonb")
    private List<Object> trackingEventsJson;

    @Column(name = "shipment_notes", columnDefinition = "text")
    private String shipmentNotes;

    @Column(name = "shipment_date")
    private OffsetDateTime shipmentDate;

    @Column(name = "return_reason", columnDefinition = "text")
    private String returnReason;

    @Column(name = "return_image_url", columnDefinition = "text")
    private String returnImageUrl;

    @Column(name = "admin_message", columnDefinition = "text")
    private String adminMessage;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "receipt_email_sent", nullable = false)
    private Boolean receiptEmailSent = false;

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

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public List<Map<String, Object>> getItems() { return items; }
    public void setItems(List<Map<String, Object>> items) { this.items = items; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<String> getCouponCodes() { return couponCodes; }
    public void setCouponCodes(List<String> couponCodes) { this.couponCodes = couponCodes; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public Boolean getStockApplied() { return stockApplied; }
    public void setStockApplied(Boolean stockApplied) { this.stockApplied = stockApplied; }

    public Map<String, Object> getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(Map<String, Object> shippingAddress) { this.shippingAddress = shippingAddress; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getRazorpaySignature() { return razorpaySignature; }
    public void setRazorpaySignature(String razorpaySignature) { this.razorpaySignature = razorpaySignature; }

    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }

    public String getTrackingId() { return trackingId; }
    public void setTrackingId(String trackingId) { this.trackingId = trackingId; }

    public String getTrackingUrl() { return trackingUrl; }
    public void setTrackingUrl(String trackingUrl) { this.trackingUrl = trackingUrl; }

    public OffsetDateTime getShippedAt() { return shippedAt; }
    public void setShippedAt(OffsetDateTime shippedAt) { this.shippedAt = shippedAt; }

    public String getCourierName() { return courierName; }
    public void setCourierName(String courierName) { this.courierName = courierName; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(String expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

    public String getShipmentStatus() { return shipmentStatus; }
    public void setShipmentStatus(String shipmentStatus) { this.shipmentStatus = shipmentStatus; }

    public OffsetDateTime getLastTrackingSync() { return lastTrackingSync; }
    public void setLastTrackingSync(OffsetDateTime lastTrackingSync) { this.lastTrackingSync = lastTrackingSync; }

    public List<Object> getTrackingEventsJson() { return trackingEventsJson; }
    public void setTrackingEventsJson(List<Object> trackingEventsJson) { this.trackingEventsJson = trackingEventsJson; }

    public String getShipmentNotes() { return shipmentNotes; }
    public void setShipmentNotes(String shipmentNotes) { this.shipmentNotes = shipmentNotes; }

    public OffsetDateTime getShipmentDate() { return shipmentDate; }
    public void setShipmentDate(OffsetDateTime shipmentDate) { this.shipmentDate = shipmentDate; }

    public String getReturnReason() { return returnReason; }
    public void setReturnReason(String returnReason) { this.returnReason = returnReason; }

    public String getReturnImageUrl() { return returnImageUrl; }
    public void setReturnImageUrl(String returnImageUrl) { this.returnImageUrl = returnImageUrl; }

    public String getAdminMessage() { return adminMessage; }
    public void setAdminMessage(String adminMessage) { this.adminMessage = adminMessage; }

    public OffsetDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(OffsetDateTime deliveredAt) { this.deliveredAt = deliveredAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getReceiptEmailSent() { return receiptEmailSent; }
    public void setReceiptEmailSent(Boolean receiptEmailSent) { this.receiptEmailSent = receiptEmailSent; }
}
