package com.durgashakti.admin.service;

import com.durgashakti.common.entity.AuditLog;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.Product;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.repository.AdminProductRepository;
import com.durgashakti.admin.repository.AuditLogRepository;
import com.durgashakti.common.exception.ApiException;
import com.razorpay.Refund;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.durgashakti.common.entity.User;
import com.durgashakti.common.util.EmailClient;
import com.durgashakti.admin.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class AdminOrderServiceImpl implements AdminOrderService {

    private final AdminOrderRepository orderRepository;
    private final AdminProductRepository productRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminUserRepository userRepository;
    private final EmailClient emailClient;
    private static final Logger log = LoggerFactory.getLogger(AdminOrderServiceImpl.class);

    @Value("${razorpay.key-id:fake_key_id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:fake_key_secret}")
    private String razorpayKeySecret;

    public AdminOrderServiceImpl(AdminOrderRepository orderRepository,
                                 AdminProductRepository productRepository,
                                 AuditLogRepository auditLogRepository,
                                 AdminUserRepository userRepository,
                                 EmailClient emailClient) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.emailClient = emailClient;
    }

    /**
     * Attempts an instant Razorpay refund. Returns true if refund was created successfully.
     * Falls back gracefully if keys are missing or Razorpay call fails.
     */
    private boolean attemptRazorpayRefund(String razorpayPaymentId, double amountInRupees, String orderNumber) {
        if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) {
            log.warn("Cannot process Razorpay refund: no razorpay_payment_id on order {}", orderNumber);
            return false;
        }
        if (razorpayKeyId == null || razorpayKeyId.contains("fake") || razorpayKeyId.isBlank()) {
            log.info("Razorpay keys not configured – skipping live refund for order {}", orderNumber);
            return false;
        }
        long amountInPaise = Math.round(amountInRupees * 100.0);
        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountInPaise);
            refundRequest.put("speed", "optimum"); // instant if available, else normal
            refundRequest.put("notes", new JSONObject().put("order_number", orderNumber));
            Refund refund = client.payments.refund(razorpayPaymentId, refundRequest);
            String refundId = refund.get("id");
            log.info("Razorpay refund created successfully: {} for order {} amount ₹{}", refundId, orderNumber, amountInRupees);
            return true;
        } catch (RazorpayException e) {
            log.error("Razorpay refund FAILED for payment {} order {}: {}", razorpayPaymentId, orderNumber, e.getMessage());
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderDetails(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @Override
    public Order updateOrderStatus(UUID orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setOrderStatus(status);
        order.setUpdatedAt(OffsetDateTime.now());
        order = orderRepository.save(order);

        if ("delivered".equalsIgnoreCase(status)) {
            sendOrderEmail(order, "Order Delivered: " + order.getOrderNumber(), 
                "Great news! Your order " + order.getOrderNumber() + " has been marked as delivered. We hope you enjoy your purchase!");
        } else if ("cancelled".equalsIgnoreCase(status)) {
            sendOrderEmail(order, "Order Cancelled: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " has been cancelled. If this was a mistake, please contact support.");
        }

        return order;
    }

    @Override
    public Order shipOrder(UUID orderId, String carrier, String trackingNumber) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        order.setOrderStatus("shipped");
        order.setCarrier(carrier);
        order.setTrackingNumber(trackingNumber);
        order.setShipmentStatus("shipped");
        order.setShipmentDate(OffsetDateTime.now());
        order.setUpdatedAt(OffsetDateTime.now());
        order = orderRepository.save(order);

        sendOrderEmail(order, "Order Shipped: " + order.getOrderNumber(), 
            "Your order " + order.getOrderNumber() + " has been shipped!\n" +
            "Carrier: " + carrier + "\nTracking Number: " + trackingNumber + "\n" +
            "You can track your order using the tracking number above.");

        return order;
    }

    @Override
    public Map<String, Object> bulkShipOrders(List<Map<String, String>> shipments) {
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (Map<String, String> shipment : shipments) {
            String orderIdStr = shipment.get("order_id");
            String carrier = shipment.get("carrier");
            String trackingNumber = shipment.get("tracking_number");
            
            Map<String, Object> res = new HashMap<>();
            res.put("order_id", orderIdStr);
            
            try {
                UUID orderId = UUID.fromString(orderIdStr);
                shipOrder(orderId, carrier, trackingNumber); 
                res.put("status", "success");
                successCount++;
            } catch (Exception e) {
                res.put("status", "failed");
                res.put("error", e.getMessage());
                failCount++;
            }
            results.add(res);
        }
        
        return Map.of(
            "success_count", successCount,
            "fail_count", failCount,
            "results", results
        );
    }

    // ── Admin Return/Exchange Action (approve/reject) ──────────────────────
    @Override
    public Order itemReturnAction(UUID orderId, String productId, String action, String remarks) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;
        boolean isExchange = false;
        String actionUpper = action.toUpperCase();

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (currentStatus == null ||
                        (!"RETURN_REQUESTED".equals(currentStatus) && !"EXCHANGE_REQUESTED".equals(currentStatus))) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item return or exchange is not requested or already processed");
                }

                isExchange = "exchange".equals(item.get("return_type")) || "EXCHANGE_REQUESTED".equals(currentStatus);
                String newStatus;
                if (isExchange) {
                    newStatus = "APPROVE".equals(actionUpper) ? "EXCHANGE_APPROVED" : "EXCHANGE_REJECTED";
                } else {
                    newStatus = "APPROVE".equals(actionUpper) ? "RETURN_APPROVED" : "RETURN_REJECTED";
                }

                item.put("return_status", newStatus);
                addAuditTimeline(item, newStatus,
                        remarks != null ? remarks :
                                (isExchange ? "Exchange" : "Return") + " " + action.toLowerCase() + "d by admin");
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        // Derive overall order status
        boolean hasPending = items.stream().anyMatch(i ->
                "RETURN_REQUESTED".equals(i.get("return_status")) ||
                        "EXCHANGE_REQUESTED".equals(i.get("return_status")));
        if (!hasPending) {
            boolean anyApproved = items.stream().anyMatch(i -> {
                String rs = (String) i.get("return_status");
                return rs != null && Set.of("RETURN_APPROVED", "EXCHANGE_APPROVED", "SELF_SHIPPED",
                        "RETURN_RECEIVED", "REFUND_INITIATED", "REFUND_COMPLETED",
                        "EXCHANGE_RECEIVED", "EXCHANGE_SHIPPED", "EXCHANGE_COMPLETED").contains(rs);
            });
            order.setOrderStatus(anyApproved ? "return_approved" : "return_rejected");
        }

        writeAuditLog("ITEM_RETURN_ACTION", "order", orderId.toString(),
                Map.of("product_id", productId, "action", action, "remarks", remarks != null ? remarks : ""));

        order = orderRepository.save(order);
        
        String typeStr = isExchange ? "Exchange" : "Return";
        String statusStr = "APPROVE".equals(actionUpper) ? "Approved" : "Rejected";
        sendOrderEmail(order, typeStr + " Request " + statusStr + ": " + order.getOrderNumber(),
            "Your " + typeStr.toLowerCase() + " request for an item in order " + order.getOrderNumber() + " has been " + statusStr.toLowerCase() + ".\n" +
            (remarks != null && !remarks.isEmpty() ? "Remarks: " + remarks : ""));
            
        return order;
    }

    // ── Admin Receive Returned Item ────────────────────────────────────────
    @Override
    public Order receiveReturnedItem(UUID orderId, String productId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (currentStatus == null ||
                        (!"SELF_SHIPPED".equals(currentStatus) && !"RETURN_APPROVED".equals(currentStatus)
                                && !"EXCHANGE_APPROVED".equals(currentStatus))) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item is not shipped or return/exchange not approved");
                }

                boolean isExchange = "exchange".equals(item.get("return_type"));
                String newStatus = isExchange ? "EXCHANGE_RECEIVED" : "RETURN_RECEIVED";
                item.put("return_status", newStatus);
                addAuditTimeline(item, newStatus,
                        "Returned item physically received at warehouse for " + (isExchange ? "exchange" : "refund"));
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        writeAuditLog("ITEM_RETURN_RECEIVED", "order", orderId.toString(),
                Map.of("product_id", productId));

        order = orderRepository.save(order);
        sendOrderEmail(order, "Returned Item Received: " + order.getOrderNumber(),
            "We have successfully received your returned item at our warehouse. We will process the next steps shortly.");
        return order;
    }

    // ── Admin Process Item Refund ──────────────────────────────────────────
    @Override
    public Order processItemRefund(UUID orderId, String productId, boolean restock,
                                   Double manualAmount, boolean isManual) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;
        double refundAmount = 0.0;
        int returnedQty = 0;

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (currentStatus == null ||
                        (!"RETURN_RECEIVED".equals(currentStatus) && !"RETURN_APPROVED".equals(currentStatus)
                                && !"SELF_SHIPPED".equals(currentStatus))) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item is not in an appropriate status for refund");
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> calc = (Map<String, Object>) item.getOrDefault("refund_calculations", new HashMap<>());

                if (manualAmount != null) {
                    refundAmount = Math.round(manualAmount * 100.0) / 100.0;
                    calc.put("refundable_amount", refundAmount);
                } else {
                    double itemRefund = toDouble(calc.get("refundable_amount"));
                    @SuppressWarnings("unchecked")
                    Map<String, Object> selfShip = (Map<String, Object>) item.getOrDefault("self_shipping_details", new HashMap<>());
                    double courierCost = toDouble(selfShip.get("courier_cost"));
                    refundAmount = Math.round((itemRefund + courierCost) * 100.0) / 100.0;
                    calc.put("refundable_amount", refundAmount);
                }
                item.put("refund_calculations", calc);
                returnedQty = toInt(item.getOrDefault("returned_quantity", 1));

                // ── REAL RAZORPAY REFUND INTEGRATION ──────────────────────────
                String refundStatus;
                String remark;

                if (isManual) {
                    // Admin manually marked as refunded (bank transfer / UPI etc)
                    refundStatus = "REFUND_COMPLETED";
                    remark = String.format("Refund of ₹%.2f completed manually by admin", refundAmount);
                } else {
                    // Attempt live Razorpay instant refund
                    boolean rzpSuccess = attemptRazorpayRefund(
                            order.getRazorpayPaymentId(), refundAmount, order.getOrderNumber());
                    if (rzpSuccess) {
                        refundStatus = "REFUND_COMPLETED";
                        remark = String.format(
                                "Razorpay refund of ₹%.2f initiated successfully (instant/optimum speed). " +
                                "Amount will reflect in customer's account within seconds to 5–7 business days.",
                                refundAmount);
                    } else {
                        refundStatus = "REFUND_FAILED";
                        remark = String.format(
                                "Razorpay refund of ₹%.2f FAILED. Manual intervention required.",
                                refundAmount);
                    }
                }

                item.put("return_status", refundStatus);
                addAuditTimeline(item, refundStatus, remark);
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        // Restock product if requested
        if (restock && returnedQty > 0) {
            try {
                UUID prodUuid = UUID.fromString(productId);
                Optional<Product> productOpt = productRepository.findById(prodUuid);
                if (productOpt.isPresent()) {
                    Product product = productOpt.get();
                    int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                    int currentSold = product.getUnitsSold() != null ? product.getUnitsSold() : 0;
                    product.setStockQuantity(currentStock + returnedQty);
                    product.setUnitsSold(Math.max(0, currentSold - returnedQty));
                    product.setInStock(true);
                    product.setUpdatedAt(OffsetDateTime.now());
                    productRepository.save(product);
                }
            } catch (IllegalArgumentException ignored) {
                // product_id is not a valid UUID — skip restock
            }
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        // Derive overall order/payment status
        boolean hasActiveReturns = items.stream().anyMatch(i -> {
            String rs = (String) i.get("return_status");
            return rs != null && Set.of("RETURN_REQUESTED", "RETURN_APPROVED", "SELF_SHIPPED", "RETURN_RECEIVED").contains(rs);
        });
        boolean hasPendingRefunds = items.stream().anyMatch(i ->
                "REFUND_FAILED".equals(i.get("return_status")));
        boolean allRefunded = items.stream()
                .filter(i -> i.get("return_status") != null)
                .allMatch(i -> "REFUND_COMPLETED".equals(i.get("return_status")));

        if (!hasActiveReturns) {
            if (hasPendingRefunds) {
                order.setOrderStatus("return_approved");
                order.setPaymentStatus("refund_pending");
            } else {
                order.setOrderStatus("refunded");
                order.setPaymentStatus("refunded");
            }
        } else if (hasPendingRefunds) {
            order.setPaymentStatus("refund_pending");
        }

        writeAuditLog("ITEM_REFUND_PROCESSED", "order", orderId.toString(),
                Map.of("product_id", productId, "amount", refundAmount, "restock", restock));

        order = orderRepository.save(order);

        // Send customer email
        boolean refundSucceeded = "REFUND_COMPLETED".equals(
                items.stream()
                     .filter(i -> productId.equals(String.valueOf(i.get("product_id"))))
                     .map(i -> (String) i.get("return_status"))
                     .findFirst().orElse(""));

        if (refundSucceeded) {
            sendOrderEmail(order,
                "Refund Initiated – " + order.getOrderNumber(),
                "Dear Customer,\n\n" +
                "Great news! We have successfully initiated a refund of ₹" +
                String.format("%.2f", refundAmount) + " for your order " + order.getOrderNumber() + ".\n\n" +
                "⚡ Instant Refund: The amount may reflect in your original payment source within seconds.\n" +
                "⏳ Standard Refund: If the instant refund is not available, it will take 5–7 business days.\n\n" +
                "You will receive a separate confirmation from Razorpay/your bank once the amount is credited.\n\n" +
                "If you have any questions, please contact our support team.\n\n" +
                "Regards,\nDurga Shakti Foils Team");
        } else {
            sendOrderEmail(order,
                "Refund Processing Issue – " + order.getOrderNumber(),
                "Dear Customer,\n\n" +
                "We encountered an issue while processing your refund of ₹" +
                String.format("%.2f", refundAmount) + " for order " + order.getOrderNumber() + ".\n\n" +
                "Our team has been notified and will process it manually within 2 business days.\n\n" +
                "We sincerely apologise for the inconvenience.\n\n" +
                "Regards,\nDurga Shakti Foils Team");
        }
        return order;
    }

    // ── Admin Retry Refund ──────────────────────────────────────────────
    @Override
    public Order retryRefund(UUID orderId, String productId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (!"REFUND_FAILED".equals(currentStatus) && !"REFUND_INITIATED".equals(currentStatus)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Refund is not in a failed or initiated state");
                }
                
                @SuppressWarnings("unchecked")
                Map<String, Object> retryCalc = (Map<String, Object>) item.getOrDefault("refund_calculations", new HashMap<>());
                double retryAmount = toDouble(retryCalc.get("refundable_amount"));

                // Attempt live Razorpay refund on retry
                boolean rzpRetrySuccess = attemptRazorpayRefund(
                        order.getRazorpayPaymentId(), retryAmount, order.getOrderNumber());

                if (rzpRetrySuccess) {
                    item.put("return_status", "REFUND_COMPLETED");
                    addAuditTimeline(item, "REFUND_COMPLETED",
                            String.format("Razorpay refund of ₹%.2f retried successfully", retryAmount));
                } else {
                    item.put("return_status", "REFUND_FAILED");
                    addAuditTimeline(item, "REFUND_FAILED",
                            String.format("Razorpay refund retry of ₹%.2f FAILED again", retryAmount));
                }
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        boolean hasActiveReturns = items.stream().anyMatch(i -> {
            String rs = (String) i.get("return_status");
            return rs != null && Set.of("RETURN_REQUESTED", "RETURN_APPROVED", "SELF_SHIPPED", "RETURN_RECEIVED").contains(rs);
        });
        boolean hasPendingRefunds = items.stream().anyMatch(i ->
                "REFUND_INITIATED".equals(i.get("return_status")));

        if (!hasActiveReturns) {
            if (hasPendingRefunds) {
                order.setOrderStatus("return_approved");
                order.setPaymentStatus("refund_pending");
            } else {
                order.setOrderStatus("refunded");
                order.setPaymentStatus("refunded");
            }
        } else if (hasPendingRefunds) {
            order.setPaymentStatus("refund_pending");
        }

        writeAuditLog("ITEM_REFUND_RETRIED", "order", orderId.toString(),
                Map.of("product_id", productId));

        order = orderRepository.save(order);
        sendOrderEmail(order, "Refund Completed: " + order.getOrderNumber(),
            "Your refund for order " + order.getOrderNumber() + " has been successfully completed.");
            
        return order;
    }

    // ── Admin Ship Exchange Item ───────────────────────────────────────────
    @Override
    public Order shipExchangeItem(UUID orderId, String productId, String courier,
                                  String trackingNumber, String expectedDeliveryDate, String notes) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (currentStatus == null ||
                        (!"EXCHANGE_RECEIVED".equals(currentStatus) && !"EXCHANGE_APPROVED".equals(currentStatus)
                                && !"SELF_SHIPPED".equals(currentStatus))) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item must be received or approved before shipping exchange");
                }

                item.put("return_status", "EXCHANGE_SHIPPED");

                Map<String, Object> shippingDetails = new HashMap<>();
                shippingDetails.put("exchange_courier_name", courier);
                shippingDetails.put("exchange_tracking_number", trackingNumber);
                shippingDetails.put("exchange_expected_delivery_date", expectedDeliveryDate);
                shippingDetails.put("exchange_shipment_notes", notes);
                item.put("exchange_shipping_details", shippingDetails);

                addAuditTimeline(item, "EXCHANGE_SHIPPED",
                        "Exchanged product shipped via " + courier + ". Tracking ID: " + trackingNumber);
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        writeAuditLog("ITEM_EXCHANGE_SHIPPED", "order", orderId.toString(),
                Map.of("product_id", productId, "courier", courier, "tracking_number", trackingNumber));

        order = orderRepository.save(order);
        sendOrderEmail(order, "Exchange Item Shipped: " + order.getOrderNumber(),
            "Your exchange item for order " + order.getOrderNumber() + " has been shipped!\n" +
            "Carrier: " + courier + "\nTracking Number: " + trackingNumber);
        return order;
    }

    // ── Admin Complete Exchange Item ───────────────────────────────────────
    @Override
    public Order completeExchangeItem(UUID orderId, String productId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> items = order.getItems();
        boolean foundItem = false;

        for (Map<String, Object> item : items) {
            if (productId.equals(String.valueOf(item.get("product_id")))) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (!"EXCHANGE_SHIPPED".equals(currentStatus)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item must be shipped before completing exchange");
                }

                item.put("return_status", "EXCHANGE_COMPLETED");
                addAuditTimeline(item, "EXCHANGE_COMPLETED",
                        "Exchange process completed and product delivered");
            }
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Item not found in order");
        }

        order.setItems(items);
        order.setUpdatedAt(OffsetDateTime.now());

        writeAuditLog("ITEM_EXCHANGE_COMPLETED", "order", orderId.toString(),
                Map.of("product_id", productId));

        order = orderRepository.save(order);
        sendOrderEmail(order, "Exchange Completed: " + order.getOrderNumber(),
            "Your exchange process for order " + order.getOrderNumber() + " is now complete.");
        return order;
    }

    // ── Helper: Add audit timeline entry to an item ───────────────────────
    @SuppressWarnings("unchecked")
    private void addAuditTimeline(Map<String, Object> item, String status, String remarks) {
        List<Map<String, Object>> timeline = (List<Map<String, Object>>) item.get("audit_timeline");
        if (timeline == null) {
            timeline = new ArrayList<>();
        }
        Map<String, Object> entry = new HashMap<>();
        entry.put("status", status);
        entry.put("timestamp", OffsetDateTime.now().toString());
        entry.put("remarks", remarks);
        timeline.add(entry);
        item.put("audit_timeline", timeline);
    }

    // ── Helper: Write audit log ───────────────────────────────────────────
    private void writeAuditLog(String action, String targetType, String targetId,
                               Map<String, Object> metadata) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setMetadata(metadata);
        log.setCreatedAt(OffsetDateTime.now());
        auditLogRepository.save(log);
    }

    // ── Helper: Safe double conversion ────────────────────────────────────
    private double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (NumberFormatException e) { return 0.0; }
    }

    // ── Helper: Safe int conversion ───────────────────────────────────────
    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (NumberFormatException e) { return 0; }
    }

    // ── Helper: Send Order Email ──────────────────────────────────────────
    private void sendOrderEmail(Order order, String subject, String body) {
        if (order.getUserId() != null) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                userRepository.findById(order.getUserId()).ifPresent(user -> {
                    try {
                        emailClient.sendEmail(user.getEmail(), subject, 
                            "Dear " + user.getFullName() + ",\n\n" + body + "\n\nBest regards,\nDurga Shakti Foils Team");
                    } catch (Exception e) {
                        log.error("Failed to send email for order {} to {}", order.getOrderNumber(), user.getEmail(), e);
                    }
                });
            });
        }
    }
}
