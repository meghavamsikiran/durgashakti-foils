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
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronization;

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

    private final com.durgashakti.common.service.InvoiceService invoiceService;
    private final WhatsAppNotificationService whatsAppNotificationService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public AdminOrderServiceImpl(AdminOrderRepository orderRepository,
                                 AdminProductRepository productRepository,
                                 AuditLogRepository auditLogRepository,
                                 AdminUserRepository userRepository,
                                 EmailClient emailClient,
                                 com.durgashakti.common.service.InvoiceService invoiceService,
                                 WhatsAppNotificationService whatsAppNotificationService,
                                 org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.emailClient = emailClient;
        this.invoiceService = invoiceService;
        this.whatsAppNotificationService = whatsAppNotificationService;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Attempts an instant Razorpay refund. Returns true if refund was created successfully.
     * Falls back gracefully if keys are missing or Razorpay call fails.
     */
    private boolean isWalletReturnsEnabled() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT value FROM settings WHERE key = 'wallet_settings'");
            if (!rows.isEmpty() && rows.get(0).get("value") != null) {
                Object valObj = rows.get(0).get("value");
                Map map = null;
                if (valObj instanceof Map) {
                    map = (Map) valObj;
                } else {
                    String jsonStr = valObj.toString();
                    if (jsonStr != null && !jsonStr.isBlank()) {
                        map = new com.fasterxml.jackson.databind.ObjectMapper().readValue(jsonStr, Map.class);
                    }
                }
                if (map != null) {
                    boolean systemEnabled = !Boolean.FALSE.equals(map.get("enabled"));
                    boolean returnsEnabled = !Boolean.FALSE.equals(map.get("returns_enabled"));
                    return systemEnabled && returnsEnabled;
                }
            }
        } catch (Exception ignored) {}
        return true;
    }

    private boolean isRazorpayConfigured() {
        return razorpayKeyId != null && !razorpayKeyId.isBlank() && !razorpayKeyId.contains("fake");
    }

    private Map<String, Object> attemptRazorpayRefund(String razorpayPaymentId, double amountInRupees, String orderNumber) {
        if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) {
            log.warn("Cannot process Razorpay refund: no razorpay_payment_id on order {}", orderNumber);
            return Map.of("success", false, "remark", "No razorpay_payment_id on order");
        }
        if (!isRazorpayConfigured()) {
            log.info("Razorpay keys not configured – skipping live refund for order {}", orderNumber);
            return Map.of("success", false, "remark", "Razorpay gateway keys not configured");
        }
        long amountInPaise = Math.round(amountInRupees * 100.0);
        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountInPaise);
            refundRequest.put("speed", "optimum");
            refundRequest.put("notes", new JSONObject().put("order_number", orderNumber));
            Refund refund = client.payments.refund(razorpayPaymentId, refundRequest);
            String refundId = refund.get("id");
            String status = refund.get("status");
            
            String rrn = null;
            Object acquirerDataObj = refund.get("acquirer_data");
            if (acquirerDataObj instanceof Map) {
                Map<?, ?> acquirerData = (Map<?, ?>) acquirerDataObj;
                if (acquirerData.get("arn") != null) {
                    rrn = String.valueOf(acquirerData.get("arn"));
                } else if (acquirerData.get("rrn") != null) {
                    rrn = String.valueOf(acquirerData.get("rrn"));
                }
            } else if (acquirerDataObj != null) {
                try {
                    JSONObject acqJson = new JSONObject(acquirerDataObj.toString());
                    if (acqJson.has("arn")) rrn = acqJson.optString("arn");
                    else if (acqJson.has("rrn")) rrn = acqJson.optString("rrn");
                } catch (Exception ignored) {}
            }
            
            log.info("Razorpay refund created successfully: {} (Status: {}, RRN: {}) for order {}", refundId, status, rrn, orderNumber);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("refund_id", refundId);
            res.put("status", status);
            if (rrn != null) res.put("rrn", rrn);
            return res;
        } catch (RazorpayException e) {
            log.error("Razorpay refund FAILED for payment {} order {}: {}", razorpayPaymentId, orderNumber, e.getMessage());
            return Map.of("success", false, "remark", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        for (Order order : orders) {
            enrichCustomerName(order);
        }
        return orders;
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderDetails(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        enrichCustomerName(order);
        return order;
    }

    private void enrichCustomerName(Order order) {
        if (order.getCustomerName() == null || order.getCustomerName().trim().isEmpty() || "Guest User".equalsIgnoreCase(order.getCustomerName().trim())) {
            if (order.getUserId() != null) {
                Optional<User> uOpt = userRepository.findById(order.getUserId());
                if (uOpt.isPresent()) {
                    order.setCustomerName(uOpt.get().getFullName());
                    return;
                }
            }
            if (order.getShippingAddress() != null) {
                Map<String, Object> addr = order.getShippingAddress();
                if (addr.get("full_name") != null) {
                    order.setCustomerName(String.valueOf(addr.get("full_name")).trim());
                } else if (addr.get("fullName") != null) {
                    order.setCustomerName(String.valueOf(addr.get("fullName")).trim());
                }
            }
        }
    }

    @Override
    public Order updateOrderStatus(UUID orderId, String status, String carrier, String trackingNumber, String expectedDeliveryDate, String shipmentNotes) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        
        if (carrier != null && !carrier.trim().isEmpty()) {
            order.setCarrier(carrier);
        }
        if (trackingNumber != null && !trackingNumber.trim().isEmpty()) {
            order.setTrackingNumber(trackingNumber);
            order.setTrackingId(trackingNumber);
            order.setShipmentStatus("shipped");
            order.setShipmentDate(OffsetDateTime.now());
        }
        if (expectedDeliveryDate != null && !expectedDeliveryDate.trim().isEmpty()) {
            try {
                order.setExpectedDeliveryDate(OffsetDateTime.parse(expectedDeliveryDate));
            } catch (Exception e) {
                try {
                    order.setExpectedDeliveryDate(java.time.LocalDate.parse(expectedDeliveryDate).atStartOfDay(java.time.ZoneOffset.UTC).toOffsetDateTime());
                } catch (Exception ignored) {}
            }
        }
        if (shipmentNotes != null) {
            order.setShipmentNotes(shipmentNotes);
        }
        
        order = orderRepository.save(order);
        return updateOrderStatus(orderId, status);
    }

    @Override
    public Order updateOrderStatus(UUID orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setOrderStatus(status);
        order.setUpdatedAt(OffsetDateTime.now());

        String statusLower = status.toLowerCase();
        
        // Sync item return states when overall order status is return_approved or return_rejected
        if ("return_approved".equals(statusLower)) {
            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    if ("RETURN_REQUESTED".equals(item.get("return_status")) || "EXCHANGE_REQUESTED".equals(item.get("return_status"))) {
                        item.put("return_status", "RETURN_APPROVED");
                        addAuditTimeline(item, "RETURN_APPROVED", "Return approved via order status update");
                    }
                }
                order.setItems(items);
            }
        } else if ("return_rejected".equals(statusLower)) {
            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    if ("RETURN_REQUESTED".equals(item.get("return_status")) || "EXCHANGE_REQUESTED".equals(item.get("return_status"))) {
                        item.put("return_status", "RETURN_REJECTED");
                        addAuditTimeline(item, "RETURN_REJECTED", "Return rejected via order status update");
                    }
                }
                order.setItems(items);
            }
        }

        order = orderRepository.save(order);

        if ("confirmed".equals(statusLower)) {
            sendOrderEmail(order, "Order Confirmed: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " has been confirmed and is now being processed.");
        } else if ("packed".equals(statusLower) || "packaging".equals(statusLower)) {
            sendOrderEmail(order, "Order Packed: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " has been packed and is ready for courier handover.");
        } else if ("shipped".equals(statusLower)) {
            sendOrderEmail(order, "Order Shipped: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " has been shipped! You can track shipping progress on the order details page.");
            whatsAppNotificationService.sendOrderShippedNotification(order);
        } else if ("out_for_delivery".equals(statusLower) || "out for delivery".equals(statusLower)) {
            sendOrderEmail(order, "Order Out for Delivery: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " is out for delivery! Our delivery partner will contact you shortly.");
        } else if ("delivered".equals(statusLower)) {
            sendOrderEmail(order, "Order Delivered: " + order.getOrderNumber(), 
                "Great news! Your order " + order.getOrderNumber() + " has been marked as delivered. We hope you enjoy your purchase!");
            whatsAppNotificationService.sendPostDeliveryFeedback(order);
        } else if ("cancelled".equals(statusLower)) {
            // Restore product stock when admin cancels the order
            final String finalOrderNum = order.getOrderNumber();
            List<Map<String, Object>> itemsList = order.getItems();
            if (itemsList != null) {
                for (Map<String, Object> item : itemsList) {
                    Object pIdObj = item.get("product_id");
                    if (pIdObj != null) {
                        try {
                            UUID productId = UUID.fromString(pIdObj.toString());
                            int qty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
                            productRepository.findByIdWithLock(productId).ifPresent(p -> {
                                int currentStock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
                                p.setStockQuantity(currentStock + qty);
                                p.setInStock(true);
                                productRepository.save(p);
                                log.info("Restored stock of product {} by quantity {} due to admin cancellation of order {}", productId, qty, finalOrderNum);
                            });
                        } catch (Exception ex) {
                            log.error("Failed to restore stock for item during order cancellation: {}", ex.getMessage());
                        }
                    }
                }
            }

            // Refund payment if paid/completed or wallet
            String pStatus = (order.getPaymentStatus() != null ? order.getPaymentStatus() : "").toLowerCase();
            String pMethod = (order.getPaymentMethod() != null ? order.getPaymentMethod() : "").toLowerCase();

            if (pStatus.contains("paid") || pStatus.contains("completed") || "wallet".equalsIgnoreCase(pMethod) || "dsf_wallet".equalsIgnoreCase(pMethod)) {
                double totalAmt = order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;
                double walletRefundAmt = 0.0;
                
                if ("wallet".equalsIgnoreCase(pMethod) || "dsf_wallet".equalsIgnoreCase(pMethod) || pStatus.contains("wallet")) {
                    try {
                        List<Map<String, Object>> txRows = jdbcTemplate.queryForList(
                            "SELECT amount FROM wallet_transactions WHERE reference_id = ? AND type = 'DEBIT' AND status = 'SUCCESS'", order.getOrderNumber()
                        );
                        if (!txRows.isEmpty() && txRows.get(0).get("amount") != null) {
                            walletRefundAmt = Double.parseDouble(txRows.get(0).get("amount").toString());
                        } else if ("wallet".equalsIgnoreCase(pMethod) || "dsf_wallet".equalsIgnoreCase(pMethod)) {
                            walletRefundAmt = totalAmt;
                        }
                    } catch (Exception ex) {
                        if ("wallet".equalsIgnoreCase(pMethod) || "dsf_wallet".equalsIgnoreCase(pMethod)) {
                            walletRefundAmt = totalAmt;
                        }
                    }
                    
                    if (!isWalletReturnsEnabled()) {
                        log.warn("[Wallet Refund Blocked] Cancelled order {}: DSF Wallet returns and refunds are disabled", order.getOrderNumber());
                    } else if (order.getUserId() != null && walletRefundAmt > 0) {
                        try {
                            jdbcTemplate.update(
                                "INSERT INTO wallets (id, user_id, balance, created_at, updated_at) " +
                                "VALUES (gen_random_uuid(), ?, ?, NOW(), NOW()) " +
                                "ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW()",
                                order.getUserId(), walletRefundAmt
                            );
                            jdbcTemplate.update(
                                "INSERT INTO wallet_transactions (id, user_id, amount, type, source, reference_id, description, status, created_at) " +
                                "VALUES (gen_random_uuid(), ?, ?, 'CREDIT', 'ORDER_REFUND', ?, ?, 'SUCCESS', NOW())",
                                order.getUserId(), java.math.BigDecimal.valueOf(walletRefundAmt), order.getOrderNumber(), "Refund for cancelled order #" + order.getOrderNumber()
                            );
                            order.setPaymentStatus("refunded");
                            log.info("[Wallet Refund] Successfully refunded ₹{} to wallet for user {} on cancelled order {}", walletRefundAmt, order.getUserId(), order.getOrderNumber());
                        } catch (Exception ex) {
                            log.error("[Wallet Refund Failed] Error refunding wallet for order {}: {}", order.getOrderNumber(), ex.getMessage());
                        }
                    }
                }
                
                double razorpayRefundAmt = totalAmt - walletRefundAmt;
                if (razorpayRefundAmt > 0 && order.getRazorpayPaymentId() != null && !order.getRazorpayPaymentId().isBlank()) {
                    // Razorpay refund
                    Map<String, Object> rzpRes = attemptRazorpayRefund(order.getRazorpayPaymentId(), razorpayRefundAmt, order.getOrderNumber());
                    if (Boolean.TRUE.equals(rzpRes.get("success"))) {
                        String rzpStatus = (String) rzpRes.get("status");
                        if ("processed".equalsIgnoreCase(rzpStatus)) {
                            order.setPaymentStatus("refunded");
                        } else {
                            order.setPaymentStatus("refund_pending");
                        }
                    }
                } else if (walletRefundAmt > 0 && razorpayRefundAmt <= 0) {
                    order.setPaymentStatus("refunded");
                }
                
                log.info("Cancelled paid order {} -- final payment status: {}", order.getOrderNumber(), order.getPaymentStatus());
            }

            // Revert coupon usage when order is cancelled
            List<String> couponCodes = order.getCouponCodes();
            if (couponCodes != null && !couponCodes.isEmpty()) {
                for (String code : couponCodes) {
                    try {
                        jdbcTemplate.update("UPDATE coupons SET total_uses = GREATEST(0, total_uses - 1) WHERE LOWER(code) = LOWER(?)", code.trim());
                    } catch (Exception ex) {
                        log.error("Failed to revert coupon total_uses for code {}: {}", code, ex.getMessage());
                    }
                }
                try {
                    jdbcTemplate.update("DELETE FROM coupon_usages WHERE order_id = ?", order.getId());
                    log.info("Reverted coupon usage records for admin cancelled order {}", order.getOrderNumber());
                } catch (Exception ex) {
                    log.error("Failed to delete coupon usage records for order {}: {}", order.getOrderNumber(), ex.getMessage());
                }
            }

            sendOrderEmail(order, "Order Cancelled: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " has been cancelled. If this was a mistake, please contact support.");
        } else if ("return_approved".equals(statusLower)) {
            sendReturnActionEmail(order, true, "Approved via bulk status update");
        } else if ("return_rejected".equals(statusLower)) {
            sendReturnActionEmail(order, false, "Rejected via bulk status update");
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
        
        sendReturnActionEmail(order, "APPROVE".equals(actionUpper), remarks);
            
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
            String itemProdId = String.valueOf(item.get("product_id"));
            if (productId.equalsIgnoreCase(itemProdId)) {
                foundItem = true;
                String currentStatus = (String) item.get("return_status");
                if (currentStatus == null ||
                        (!"RETURN_RECEIVED".equalsIgnoreCase(currentStatus) &&
                         !"RETURN_APPROVED".equalsIgnoreCase(currentStatus) &&
                         !"SELF_SHIPPED".equalsIgnoreCase(currentStatus) &&
                         !"REFUND_FAILED".equalsIgnoreCase(currentStatus) &&
                         !"REFUND_PENDING".equalsIgnoreCase(currentStatus))) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Item is not in an appropriate status for refund (current: " + currentStatus + ")");
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> calcRaw = (Map<String, Object>) item.get("refund_calculations");
                Map<String, Object> calc = calcRaw != null ? new HashMap<>(calcRaw) : new HashMap<>();

                if (manualAmount != null) {
                    refundAmount = Math.round(manualAmount * 100.0) / 100.0;
                    calc.put("refundable_amount", refundAmount);
                } else {
                    double itemRefund = toDouble(calc.get("refundable_amount"));
                    if (itemRefund <= 0.0) {
                        double itemPrice = toDouble(item.get("price"));
                        int qty = toInt(item.getOrDefault("returned_quantity", item.getOrDefault("quantity", 1)));
                        if (qty <= 0) qty = 1;
                        double cgst = toDouble(item.get("cgst"));
                        double sgst = toDouble(item.get("sgst"));
                        
                        if (cgst == 0.0 && sgst == 0.0) {
                            double taxable = itemPrice * qty;
                            cgst = Math.round(taxable * 0.09 * 100.0) / 100.0;
                            sgst = Math.round(taxable * 0.09 * 100.0) / 100.0;
                        }
                        
                        itemRefund = Math.round(((itemPrice * qty) + cgst + sgst) * 100.0) / 100.0;
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, Object> selfShip = (Map<String, Object>) item.get("self_shipping_details");
                    double courierCost = selfShip != null ? toDouble(selfShip.get("courier_cost")) : 0.0;
                    refundAmount = Math.round((itemRefund + courierCost) * 100.0) / 100.0;
                    calc.put("refundable_amount", refundAmount);
                }
                item.put("refund_calculations", calc);
                returnedQty = toInt(item.getOrDefault("returned_quantity", 1));

                // ── REAL RAZORPAY REFUND INTEGRATION ──────────────────────────
                String refundStatus;
                String remark;

                String pMethod = (order.getPaymentMethod() != null ? order.getPaymentMethod() : "").toLowerCase();
                String pStatus = (order.getPaymentStatus() != null ? order.getPaymentStatus() : "").toLowerCase();
                boolean isWalletOrder = "wallet".equals(pMethod) || "dsf_wallet".equals(pMethod) || pStatus.contains("wallet");

                if (isManual) {
                    refundStatus = "REFUND_COMPLETED";
                    remark = String.format("Refund of ₹%.2f completed manually by admin", refundAmount);
                    calc.put("refund_method", "manual");
                } else if (isWalletOrder) {
                    // Wallet-paid order: credit back to wallet
                    String walletResult = creditWalletFallback(order, refundAmount, calc);
                    if ("REFUND_COMPLETED".equals(walletResult)) {
                        refundStatus = "REFUND_COMPLETED";
                        remark = String.format("DSF Wallet refund of ₹%.2f credited to customer wallet successfully", refundAmount);
                    } else {
                        refundStatus = "REFUND_FAILED";
                        remark = String.format("Wallet refund of ₹%.2f failed. Check server logs for details.", refundAmount);
                    }
                } else {
                    // Always try DSF Wallet credit for return refunds
                    String fallbackStatus = creditWalletFallback(order, refundAmount, calc);
                    if ("REFUND_COMPLETED".equals(fallbackStatus)) {
                        refundStatus = "REFUND_COMPLETED";
                        remark = String.format("Refund of ₹%.2f credited to customer DSF Wallet successfully.", refundAmount);
                    } else if (isRazorpayConfigured()) {
                        // Wallet failed, try Razorpay gateway as secondary
                        Map<String, Object> rzpRes = attemptRazorpayRefund(order.getRazorpayPaymentId(), refundAmount, order.getOrderNumber());
                        if (Boolean.TRUE.equals(rzpRes.get("success"))) {
                            String rzpStatus = (String) rzpRes.get("status");
                            String refundId = (String) rzpRes.get("refund_id");
                            String rrn = (String) rzpRes.get("rrn");
                            calc.put("refund_id", refundId);
                            calc.put("refund_method", "razorpay");
                            if (rrn != null) calc.put("rrn", rrn);
                            if ("processed".equalsIgnoreCase(rzpStatus)) {
                                refundStatus = "REFUND_COMPLETED";
                                remark = String.format("Razorpay refund of ₹%.2f processed successfully. RRN/ARN: %s", refundAmount, rrn != null ? rrn : "Pending");
                            } else {
                                refundStatus = "REFUND_PENDING";
                                remark = String.format("Razorpay refund of ₹%.2f initiated (Pending bank processing). Reference ID: %s", refundAmount, refundId);
                            }
                        } else {
                            refundStatus = "REFUND_FAILED";
                            remark = String.format("Refund of ₹%.2f FAILED: Wallet and gateway both unavailable. %s", refundAmount, rzpRes.getOrDefault("remark", "Unknown error"));
                        }
                    } else {
                        refundStatus = "REFUND_FAILED";
                        remark = String.format("Refund of ₹%.2f FAILED: Wallet credit failed and Razorpay gateway is not configured.", refundAmount);
                    }
                }

                item.put("refund_calculations", calc);
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
                Optional<Product> productOpt = productRepository.findByIdWithLock(prodUuid);
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

        try {
            Map<String, Object> auditMeta = new HashMap<>();
            auditMeta.put("product_id", productId != null ? productId : "");
            auditMeta.put("amount", refundAmount);
            auditMeta.put("restock", restock);
            writeAuditLog("ITEM_REFUND_PROCESSED", "order", orderId.toString(), auditMeta);
        } catch (Exception auditEx) {
            log.warn("[Audit Log Warning] Failed to write item refund audit log: {}", auditEx.getMessage());
        }

        order = orderRepository.save(order);

        String returnStatusOfItem = "";
        String rrn = null;
        String refundId = null;

        for (Map<String, Object> i : items) {
            if (i != null && productId.equalsIgnoreCase(String.valueOf(i.get("product_id")))) {
                Object rs = i.get("return_status");
                if (rs != null) {
                    returnStatusOfItem = String.valueOf(rs);
                }
                Map<?, ?> itemCalc = (Map<?, ?>) i.get("refund_calculations");
                if (itemCalc != null) {
                    Object rrnObj = itemCalc.get("rrn");
                    if (rrnObj != null) rrn = String.valueOf(rrnObj);
                    Object rIdObj = itemCalc.get("refund_id");
                    if (rIdObj != null) refundId = String.valueOf(rIdObj);
                }
                break;
            }
        }

        boolean refundSucceeded = "REFUND_COMPLETED".equals(returnStatusOfItem);
        boolean refundPending = "REFUND_PENDING".equals(returnStatusOfItem);

        if (refundSucceeded) {
            String rrnPart = rrn != null ? "\n\nRefund Reference Number (RRN/ARN): " + rrn : "";
            sendOrderEmail(order,
                "Refund Completed – " + order.getOrderNumber(),
                "Great news! We have successfully completed your refund of ₹" +
                String.format("%.2f", refundAmount) + " for order " + order.getOrderNumber() + "." + rrnPart + "\n\n" +
                "⚡ The amount has been credited back to your original payment source.");
        } else if (refundPending) {
            sendOrderEmail(order,
                "Refund Initiated – " + order.getOrderNumber(),
                "Your refund of ₹" + String.format("%.2f", refundAmount) + " for order " + order.getOrderNumber() + " has been initiated successfully.\n\n" +
                "Reference ID: " + (refundId != null ? refundId : "Pending") + "\n\n" +
                "The amount will reflect in your bank account within 5–7 business days depending on bank processing.");
        } else {
            sendOrderEmail(order,
                "Refund Processing Issue – " + order.getOrderNumber(),
                "We encountered an issue while processing your refund of ₹" +
                String.format("%.2f", refundAmount) + " for order " + order.getOrderNumber() + ".\n\n" +
                "Our team has been notified and will process it manually within 2 business days.\n\n" +
                "We sincerely apologize for the inconvenience.");
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

                // Always try DSF Wallet credit first for return refund retries
                String fallbackStatus = creditWalletFallback(order, retryAmount, retryCalc);
                item.put("refund_calculations", retryCalc);
                if ("REFUND_COMPLETED".equals(fallbackStatus)) {
                    item.put("return_status", "REFUND_COMPLETED");
                    addAuditTimeline(item, "REFUND_COMPLETED",
                            String.format("Refund of ₹%.2f credited to customer DSF Wallet successfully.", retryAmount));
                } else if (isRazorpayConfigured()) {
                    // Wallet failed, try Razorpay gateway as secondary
                    Map<String, Object> rzpRes = attemptRazorpayRefund(
                            order.getRazorpayPaymentId(), retryAmount, order.getOrderNumber());
                    if (Boolean.TRUE.equals(rzpRes.get("success"))) {
                        String rzpStatus = (String) rzpRes.get("status");
                        String refundId = (String) rzpRes.get("refund_id");
                        String rrn = (String) rzpRes.get("rrn");
                        retryCalc.put("refund_id", refundId);
                        if (rrn != null) retryCalc.put("rrn", rrn);
                        item.put("refund_calculations", retryCalc);
                        if ("processed".equalsIgnoreCase(rzpStatus)) {
                            item.put("return_status", "REFUND_COMPLETED");
                            addAuditTimeline(item, "REFUND_COMPLETED",
                                    String.format("Razorpay refund of ₹%.2f retried successfully. RRN/ARN: %s", retryAmount, rrn != null ? rrn : "Pending"));
                        } else {
                            item.put("return_status", "REFUND_PENDING");
                            addAuditTimeline(item, "REFUND_PENDING",
                                    String.format("Razorpay refund of ₹%.2f retried (Pending bank processing). Reference ID: %s", retryAmount, refundId));
                        }
                    } else {
                        item.put("return_status", "REFUND_FAILED");
                        addAuditTimeline(item, "REFUND_FAILED",
                                String.format("Refund retry of ₹%.2f FAILED: Wallet and gateway both unavailable.", retryAmount));
                    }
                } else {
                    item.put("return_status", "REFUND_FAILED");
                    addAuditTimeline(item, "REFUND_FAILED",
                            String.format("Refund retry of ₹%.2f FAILED: Wallet credit failed and Razorpay gateway is not configured.", retryAmount));
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
        if (item == null) return;
        try {
            List<Map<String, Object>> timelineRaw = (List<Map<String, Object>>) item.get("audit_timeline");
            List<Map<String, Object>> timeline = timelineRaw != null ? new ArrayList<>(timelineRaw) : new ArrayList<>();
            Map<String, Object> entry = new HashMap<>();
            entry.put("status", status != null ? status : "");
            entry.put("timestamp", OffsetDateTime.now().toString());
            entry.put("remarks", remarks != null ? remarks : "");
            timeline.add(entry);
            item.put("audit_timeline", timeline);
        } catch (Exception ex) {
            log.warn("[Audit Timeline Warning] Could not add timeline entry: {}", ex.getMessage());
        }
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

    private void sendOrderEmail(Order order, String subject, String body) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendOrderEmailAsync(order, subject, body);
                }
            });
        } else {
            sendOrderEmailAsync(order, subject, body);
        }
    }

    private void sendOrderEmailAsync(Order order, String subject, String body) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            User targetUser = null;
            if (order.getUserId() != null) {
                targetUser = userRepository.findById(order.getUserId()).orElse(null);
            }
            if (targetUser == null) {
                String email = extractEmailFromOrder(order);
                if (email != null && !email.isBlank()) {
                    targetUser = userRepository.findByEmail(email).orElse(null);
                    if (targetUser == null) {
                        targetUser = new User();
                        targetUser.setEmail(email);
                        String name = "Customer";
                        if (order.getShippingAddress() != null && order.getShippingAddress().get("full_name") != null) {
                            name = String.valueOf(order.getShippingAddress().get("full_name"));
                        } else if (order.getCustomerName() != null) {
                            name = order.getCustomerName();
                        }
                        targetUser.setFullName(name);
                    }
                }
            }

            if (targetUser != null && targetUser.getEmail() != null && !targetUser.getEmail().isBlank()) {
                final User user = targetUser;
                try {
                        // Build premium HTML items table
                        StringBuilder itemsHtml = new StringBuilder();
                        if (order.getItems() != null && !order.getItems().isEmpty()) {
                            itemsHtml.append("<table width=\"100%\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:12px;overflow:hidden;\">");
                            itemsHtml.append("<thead style=\"background:#e2e8f0;\"><tr>");
                            itemsHtml.append("<th align=\"left\" style=\"font-size:12px;color:#475569;font-weight:700;padding:12px;width:60px;\">Image</th>");
                            itemsHtml.append("<th align=\"left\" style=\"font-size:12px;color:#475569;font-weight:700;padding:12px;\">Product</th>");
                            itemsHtml.append("<th align=\"center\" style=\"font-size:12px;color:#475569;font-weight:700;padding:12px;\">Qty</th>");
                            itemsHtml.append("<th align=\"right\" style=\"font-size:12px;color:#475569;font-weight:700;padding:12px;\">Total</th>");
                            itemsHtml.append("</tr></thead><tbody>");
                            
                            for (Map<String, Object> item : order.getItems()) {
                                String name = String.valueOf(item.getOrDefault("product_name", "Product"));
                                String size = item.get("selectedSize") != null ? " (" + item.get("selectedSize") + ")" : "";
                                int qty = 1;
                                try {
                                    qty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
                                } catch (Exception ignored) {}
                                double price = 0.0;
                                try {
                                    price = Double.parseDouble(String.valueOf(item.getOrDefault("price", 0.0)));
                                } catch (Exception ignored) {}
                                double total = price * qty;
                                
                                String rawImg = String.valueOf(item.get("image_url"));
                                String imageUrl = "https://durgashakti-foils.vercel.app/logo-durga.png";
                                if (rawImg != null && !rawImg.trim().isEmpty() && !"null".equalsIgnoreCase(rawImg)) {
                                    if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) {
                                        imageUrl = rawImg;
                                    } else {
                                        String cleanImg = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
                                        if (cleanImg.startsWith("/uploads/")) {
                                            imageUrl = "https://durgashakti-foils-2.onrender.com" + cleanImg;
                                        } else {
                                            imageUrl = "https://durgashakti-foils.vercel.app" + cleanImg;
                                        }
                                    }
                                }

                                itemsHtml.append("<tr style=\"border-bottom:1px solid #f1f5f9;\">");
                                itemsHtml.append("<td style=\"padding:10px;\"><img src=\"").append(imageUrl).append("\" width=\"40\" height=\"40\" style=\"border-radius:6px;object-fit:cover;display:block;\" alt=\"Product\" /></td>");
                                itemsHtml.append("<td style=\"font-size:13px;color:#1e293b;padding:12px;\">").append(name).append(size).append("</td>");
                                itemsHtml.append("<td align=\"center\" style=\"font-size:13px;color:#1e293b;padding:12px;\">").append(qty).append("</td>");
                                itemsHtml.append("<td align=\"right\" style=\"font-size:13px;color:#1e293b;font-weight:600;padding:12px;\">Rs. ").append(String.format("%.2f", total)).append("</td>");
                                itemsHtml.append("</tr>");
                            }
                            itemsHtml.append("</tbody></table>");
                        }

                        // Determine order status indicator colors or icons
                        String statusName = order.getOrderStatus() != null ? order.getOrderStatus().toUpperCase() : "PROCESSING";
                        
                        // Tracking Section
                        String trackingHtml = "";
                        if (order.getTrackingNumber() != null && !order.getTrackingNumber().trim().isEmpty()) {
                            String carrier = order.getCarrier() != null ? order.getCarrier() : "Courier Service";
                            String cleanNum = order.getTrackingNumber().trim();
                            String carrierLower = carrier.toLowerCase();
                            String trackUrl = order.getTrackingUrl();
                            if (trackUrl == null || trackUrl.trim().isEmpty() || carrierLower.contains("india post") || carrierLower.contains("speed post")) {
                                trackUrl = "https://t.17track.net/en#nums=" + cleanNum;
                            }
                            trackingHtml = "<div style=\"background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:20px;margin-bottom:24px;\">\n" +
                                    "  <p style=\"margin:0 0 4px;font-size:12px;color:#c2410c;font-weight:700;text-transform:uppercase;\">Shipment Tracking Information</p>\n" +
                                    "  <p style=\"margin:0 0 12px;font-size:14px;color:#475569;\"><strong>Carrier:</strong> " + carrier + " &nbsp;|&nbsp; <strong>Tracking #:</strong> " + order.getTrackingNumber() + "</p>\n" +
                                    "  <a href=\"" + trackUrl + "\" target=\"_blank\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:10px 24px;font-weight:700;border-radius:8px;display:inline-block;font-size:13px;box-shadow:0 4px 10px rgba(234,88,12,0.2);\">Track Your Shipment</a>\n" +
                                    "</div>";
                        }

                        String htmlBody = "<html>\n" +
                                "<body style=\"margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;\">\n" +
                                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:30px 0;\">\n" +
                                "<tr><td align=\"center\">\n" +
                                "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);\">\n" +
                                "  <!-- Header -->\n" +
                                "  <tr><td style=\"background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;\">\n" +
                                "    <img src=\"https://durgashakti-foils.vercel.app/logo-durga.png\" width=\"250\" style=\"display:block;margin:0 auto;\" alt=\"DurgaShakti Logo\">\n" +
                                "  </td></tr>\n" +
                                "  <!-- Body -->\n" +
                                "  <tr><td style=\"padding:40px 40px 20px;color:#1e293b;\">\n" +
                                "    <h2 style=\"margin:0 0 8px;color:#ea580c;font-size:20px;font-weight:700;\">" + subject + "</h2>\n" +
                                "    <p style=\"margin:0 0 24px;font-size:14px;color:#64748b;\">Order Number: #" + order.getOrderNumber() + " &nbsp;|&nbsp; Status: <strong>" + statusName + "</strong></p>\n" +
                                "    \n" +
                                "    <p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;\">Dear " + user.getFullName() + ",</p>\n" +
                                "    <p style=\"margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;\">" + body + "</p>\n" +
                                "    \n" +
                                "    " + trackingHtml + "\n" +
                                "    \n" +
                                "    " + itemsHtml.toString() + "\n" +
                                "    \n" +
                                "    <div style=\"border-top:1px solid #f1f5f9;padding-top:16px;margin:24px 0;\">\n" +
                                "      " + getEmailBreakoutHtml(order) + "\n" +
                                "    </div>\n" +
                                "    \n" +
                                "    <div style=\"text-align:center;margin:32px 0;\">\n" +
                                "      <a href=\"https://durgashakti-foils.vercel.app/order/" + order.getId() + "\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:700;border-radius:8px;display:inline-block;font-size:14px;box-shadow:0 4px 12px rgba(234,88,12,0.25);\">View Order</a>\n" +
                                "    </div>\n" +
                                "    \n" +
                                "    <p style=\"margin:0;font-size:14px;line-height:1.6;color:#64748b;\">Best regards,<br>The Durga Shakti Foils Team</p>\n" +
                                "  </td></tr>\n" +
                                "  <!-- Footer -->\n" +
                                "  <tr><td style=\"background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #f1f5f9;\">\n" +
                                "    <p style=\"margin:0;font-size:12px;color:#94a3b8;\">© " + java.time.Year.now().getValue() + " Durga Shakti Foils. All rights reserved.</p>\n" +
                                "  </td></tr>\n" +
                                "</table>\n" +
                                "</td></tr>\n" +
                                "</table>\n" +
                                "</body>\n" +
                                "</html>";
                        
                        byte[] pdfBytes = null;
                        String attachmentName = null;
                        try {
                            pdfBytes = invoiceService.generateInvoicePdf(order);
                            if (pdfBytes != null && pdfBytes.length > 0) {
                                attachmentName = "Tax_Invoice_" + order.getOrderNumber() + ".pdf";
                                log.info("Invoice PDF generated for order {} status email: {} bytes", order.getOrderNumber(), pdfBytes.length);
                            } else {
                                log.warn("Invoice PDF returned empty for order {}", order.getOrderNumber());
                                pdfBytes = null;
                            }
                        } catch (Exception ex) {
                            log.error("Failed to generate invoice PDF for order {}: {}", order.getOrderNumber(), ex.getMessage(), ex);
                        }

                        if (pdfBytes != null && attachmentName != null) {
                            emailClient.sendEmail(user.getEmail(), subject, htmlBody, pdfBytes, attachmentName);
                        } else {
                            emailClient.sendEmail(user.getEmail(), subject, htmlBody);
                        }
                    } catch (Exception e) {
                        log.error("Failed to send email for order {} to {}", order.getOrderNumber(), user.getEmail(), e);
                    }
            }
        });
    }

    private String getEmailBreakoutHtml(Order order) {
        double subtotal = 0.0;
        double discount = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
        double cgstTotal = 0.0;
        double sgstTotal = 0.0;
        double shippingCharge = 0.0;
        double codCharge = 0.0;
        double grandTotal = order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;

        Map<String, Object> metadata = null;
        if (order.getShippingAddress() != null && order.getShippingAddress().get("shipping_metadata") instanceof Map) {
            metadata = (Map<String, Object>) order.getShippingAddress().get("shipping_metadata");
        }

        if (metadata != null) {
            subtotal = toDouble(metadata.get("subtotal"));
            cgstTotal = toDouble(metadata.get("cgst_amount"));
            sgstTotal = toDouble(metadata.get("sgst_amount"));
            shippingCharge = toDouble(metadata.get("shipping_cost"));
            codCharge = toDouble(metadata.get("cod_charge"));
        } else {
            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                    int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                    subtotal += price * qty;
                }
            }
            double taxableAmount = Math.max(0, subtotal - discount);
            cgstTotal = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
            sgstTotal = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
            double remaining = Math.max(0, Math.round((grandTotal - (taxableAmount + cgstTotal + sgstTotal)) * 100.0) / 100.0);
            
            if (remaining > 0) {
                if ("cod".equalsIgnoreCase(order.getPaymentMethod())) {
                    if (remaining >= 20.0) {
                        codCharge = 20.0;
                        shippingCharge = remaining - 20.0;
                    } else {
                        codCharge = remaining;
                        shippingCharge = 0.0;
                    }
                } else {
                    shippingCharge = remaining;
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<table width=\"100%\" cellpadding=\"4\" cellspacing=\"0\" style=\"font-size:13px;color:#475569;\">");
        sb.append("<tr><td>Subtotal</td><td align=\"right\">Rs. ").append(String.format("%.2f", subtotal)).append("</td></tr>");
        if (cgstTotal > 0) {
            sb.append("<tr><td>CGST (9%)</td><td align=\"right\">Rs. ").append(String.format("%.2f", cgstTotal)).append("</td></tr>");
        }
        if (sgstTotal > 0) {
            sb.append("<tr><td>SGST (9%)</td><td align=\"right\">Rs. ").append(String.format("%.2f", sgstTotal)).append("</td></tr>");
        }
        if (discount > 0) {
            sb.append("<tr><td>Coupon Discount</td><td align=\"right\" style=\"color:#16a34a;\">- Rs. ").append(String.format("%.2f", discount)).append("</td></tr>");
        }
        if (shippingCharge > 0) {
            sb.append("<tr><td>Shipping Charges</td><td align=\"right\">Rs. ").append(String.format("%.2f", shippingCharge)).append("</td></tr>");
        }
        if (codCharge > 0) {
            sb.append("<tr><td>COD Service Charge</td><td align=\"right\">Rs. ").append(String.format("%.2f", codCharge)).append("</td></tr>");
        }
        sb.append("<tr style=\"font-weight:700;font-size:15px;color:#ea580c;\">");
        sb.append("<td style=\"border-top:1px solid #e2e8f0;padding-top:8px;\">Total Value</td>");
        sb.append("<td align=\"right\" style=\"border-top:1px solid #e2e8f0;padding-top:8px;\">Rs. ").append(String.format("%.2f", grandTotal)).append("</td></tr>");
        sb.append("</table>");
        return sb.toString();
    }

    private void sendReturnActionEmail(Order order, boolean isApprove, String remarks) {
        String subject;
        String body;
        String remarksBlock = (remarks != null && !remarks.isEmpty())
                ? "<div style=\"background-color:#f8fafc; border-left:4px solid #ea580c; padding:15px; margin:20px 0; border-radius:8px; font-size:13px; color:#475569;\">" +
                  "<strong>Message from Store Admin:</strong><br/>" + remarks + "</div>"
                : "";

        if (isApprove) {
            subject = "Return Request Approved - Action Required: " + order.getOrderNumber();
            body = "Your return request for order <strong>" + order.getOrderNumber() + "</strong> has been approved.<br/><br/>" +
                   "<strong>Self-Shipment Instructions:</strong><br/>" +
                   "1. Please ship the item back to our address within <strong>3 days</strong> (by " + 
                   OffsetDateTime.now().plusDays(3).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ").<br/>" +
                   "2. Go to your Order Details page on our website and click 'Track Return Shipment' to submit your courier name and tracking ID.<br/>" +
                   "3. Return shipping address: Plot no 54, Shop no 1, Maruthi nagar, Mallampet, Hyderabad, Telangana - 500090.<br/><br/>" +
                   "<strong>IMPORTANT NOTICE:</strong> If you do not self-ship the item and submit the tracking details within 3 days, " +
                   "your return request will automatically expire and the order will no longer be eligible for return or exchange.<br/>" +
                   remarksBlock;
        } else {
            subject = "Return Request Rejected: " + order.getOrderNumber();
            body = "We regret to inform you that your return request for order <strong>" + order.getOrderNumber() + "</strong> has been rejected.<br/>" +
                   (remarksBlock.isEmpty() 
                       ? "<div style=\"background-color:#fef2f2; border-left:4px solid #ef4444; padding:15px; margin:20px 0; border-radius:8px; font-size:13px; color:#991b1b;\">" +
                         "<strong>Reason:</strong> The request does not meet our return policy guidelines.</div>"
                       : remarksBlock);
        }
        sendOrderEmail(order, subject, body);
    }

    private String extractEmailFromOrder(Order order) {
        if (order == null) return null;
        if (order.getUserId() != null) {
            try {
                Optional<User> uOpt = userRepository.findById(order.getUserId());
                if (uOpt.isPresent() && uOpt.get().getEmail() != null && !uOpt.get().getEmail().isBlank()) {
                    return uOpt.get().getEmail().trim();
                }
            } catch (Exception ignored) {}
        }
        if (order.getShippingAddress() != null) {
            Map<String, Object> addr = order.getShippingAddress();
            for (String key : List.of("email", "customer_email", "user_email", "contact_email")) {
                Object emailObj = addr.get(key);
                if (emailObj != null && !emailObj.toString().isBlank()) {
                    return emailObj.toString().trim();
                }
            }
        }
        return null;
    }

    private String creditWalletFallback(Order order, double refundAmount, Map<String, Object> calc) {
        if (order == null) return "REFUND_FAILED";

        log.info("[creditWalletFallback] Order #{}: initiating wallet refund of ₹{}", order.getOrderNumber(), refundAmount);

        UUID targetUserId = order.getUserId();
        String targetEmail = extractEmailFromOrder(order);

        // 1. Verify if targetUserId actually exists in users table
        if (targetUserId != null) {
            try {
                boolean userExists = userRepository.existsById(targetUserId);
                if (!userExists) {
                    log.warn("[creditWalletFallback] Order #{} has userId {} which does NOT exist in users table. Falling back to email lookup.", 
                             order.getOrderNumber(), targetUserId);
                    targetUserId = null;
                }
            } catch (Exception ex) {
                log.error("[creditWalletFallback] Error checking userId existence for order #{}: {}", order.getOrderNumber(), ex.getMessage());
            }
        }

        // 2. If targetUserId is null/invalid, search by email or auto-create guest user
        if (targetUserId == null && targetEmail != null && !targetEmail.isBlank()) {
            try {
                Optional<User> uOpt = userRepository.findByEmail(targetEmail.trim().toLowerCase());
                if (uOpt.isPresent()) {
                    targetUserId = uOpt.get().getId();
                    log.info("[creditWalletFallback] Resolved userId {} from email {} for order #{}", targetUserId, targetEmail, order.getOrderNumber());
                } else {
                    // Auto-create user for guest customer so refund can be safely stored
                    User guestUser = new User();
                    guestUser.setEmail(targetEmail.trim().toLowerCase());
                    guestUser.setPassword(UUID.randomUUID().toString());
                    String name = "Customer";
                    if (order.getShippingAddress() != null && order.getShippingAddress().get("full_name") != null) {
                        name = String.valueOf(order.getShippingAddress().get("full_name"));
                    } else if (order.getCustomerName() != null && !order.getCustomerName().isBlank()) {
                        name = order.getCustomerName();
                    }
                    guestUser.setFullName(name);
                    guestUser.setRole("customer");
                    guestUser.setStatus("active");
                    guestUser.setIsActive(true);
                    guestUser = userRepository.save(guestUser);
                    targetUserId = guestUser.getId();
                    log.info("[creditWalletFallback] Auto-created user account {} ({}) for refund on order #{}", 
                             targetUserId, targetEmail, order.getOrderNumber());
                }
            } catch (Exception ex) {
                log.error("[creditWalletFallback] Error in email resolution / user creation for order #{}: {}", order.getOrderNumber(), ex.getMessage(), ex);
            }
        }

        if (targetUserId == null) {
            log.error("[creditWalletFallback] FAILED: Could not resolve or create userId for order #{}. Target email: {}", 
                      order.getOrderNumber(), targetEmail);
            return "REFUND_FAILED";
        }

        if (refundAmount <= 0) {
            log.error("[creditWalletFallback] FAILED: refundAmount is {} for order #{}", refundAmount, order.getOrderNumber());
            return "REFUND_FAILED";
        }

        java.math.BigDecimal refundBD = java.math.BigDecimal.valueOf(refundAmount).setScale(2, java.math.RoundingMode.HALF_UP);

        try {
            jdbcTemplate.update(
                "INSERT INTO wallets (id, user_id, balance, created_at, updated_at) " +
                "VALUES (gen_random_uuid(), ?, ?, NOW(), NOW()) " +
                "ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW()",
                targetUserId, refundBD
            );
            jdbcTemplate.update(
                "INSERT INTO wallet_transactions (id, user_id, amount, type, source, reference_id, description, status, created_at) " +
                "VALUES (gen_random_uuid(), ?, ?, 'CREDIT', 'RETURN_REFUND', ?, ?, 'SUCCESS', NOW())",
                targetUserId, refundBD, order.getOrderNumber(), "Return refund for order #" + order.getOrderNumber()
            );

            if (calc != null) {
                calc.put("refund_method", "wallet");
            }
            order.setUserId(targetUserId);
            order.setPaymentStatus("refunded");
            log.info("[creditWalletFallback] SUCCESS: Credited ₹{} to DSF Wallet for user {} on order #{}", 
                     refundBD, targetUserId, order.getOrderNumber());
            return "REFUND_COMPLETED";
        } catch (Exception walletEx) {
            log.error("[creditWalletFallback] EXCEPTION: Failed to credit wallet for user {} on order #{}: {}", 
                      targetUserId, order.getOrderNumber(), walletEx.getMessage(), walletEx);
            return "REFUND_FAILED";
        }
    }
}

