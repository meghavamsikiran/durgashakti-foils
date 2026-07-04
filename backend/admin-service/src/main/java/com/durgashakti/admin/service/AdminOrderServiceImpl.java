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

    private final com.durgashakti.common.service.InvoiceService invoiceService;

    public AdminOrderServiceImpl(AdminOrderRepository orderRepository,
                                 AdminProductRepository productRepository,
                                 AuditLogRepository auditLogRepository,
                                 AdminUserRepository userRepository,
                                 EmailClient emailClient,
                                 com.durgashakti.common.service.InvoiceService invoiceService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.emailClient = emailClient;
        this.invoiceService = invoiceService;
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
        } else if ("out_for_delivery".equals(statusLower) || "out for delivery".equals(statusLower)) {
            sendOrderEmail(order, "Order Out for Delivery: " + order.getOrderNumber(), 
                "Your order " + order.getOrderNumber() + " is out for delivery! Our delivery partner will contact you shortly.");
        } else if ("delivered".equals(statusLower)) {
            sendOrderEmail(order, "Order Delivered: " + order.getOrderNumber(), 
                "Great news! Your order " + order.getOrderNumber() + " has been marked as delivered. We hope you enjoy your purchase!");
        } else if ("cancelled".equals(statusLower)) {
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

        boolean refundSucceeded = "REFUND_COMPLETED".equals(
                items.stream()
                     .filter(i -> productId.equals(String.valueOf(i.get("product_id"))))
                     .map(i -> (String) i.get("return_status"))
                     .findFirst().orElse(""));

        if (refundSucceeded) {
            sendOrderEmail(order,
                "Refund Completed – " + order.getOrderNumber(),
                "Great news! We have successfully completed your refund of ₹" +
                String.format("%.2f", refundAmount) + " for order " + order.getOrderNumber() + ".\n\n" +
                "⚡ The amount has been credited back to your original payment source.");
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

    private void sendOrderEmail(Order order, String subject, String body) {
        if (order.getUserId() != null) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                userRepository.findById(order.getUserId()).ifPresent(user -> {
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
                            String trackUrl = order.getTrackingUrl() != null && !order.getTrackingUrl().trim().isEmpty() 
                                    ? order.getTrackingUrl() 
                                    : "https://durgashakti-foils.vercel.app/orders";
                            trackingHtml = "<div style=\"background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:20px;margin-bottom:24px;\">\n" +
                                    "  <p style=\"margin:0 0 4px;font-size:12px;color:#c2410c;font-weight:700;text-transform:uppercase;\">Shipment Tracking Information</p>\n" +
                                    "  <p style=\"margin:0 0 12px;font-size:14px;color:#475569;\"><strong>Carrier:</strong> " + carrier + " &nbsp;|&nbsp; <strong>Tracking #:</strong> " + order.getTrackingNumber() + "</p>\n" +
                                    "  <a href=\"" + trackUrl + "\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:10px 24px;font-weight:700;border-radius:8px;display:inline-block;font-size:13px;box-shadow:0 4px 10px rgba(234,88,12,0.2);\">Track Your Shipment</a>\n" +
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
                        if ("delivered".equalsIgnoreCase(order.getOrderStatus())) {
                            try {
                                pdfBytes = invoiceService.generateInvoicePdf(order);
                                attachmentName = "Tax_Invoice_" + order.getOrderNumber() + ".pdf";
                            } catch (Exception ex) {
                                log.error("Failed to generate invoice on delivery: {}", ex.getMessage());
                            }
                        }

                        if (pdfBytes != null && attachmentName != null) {
                            emailClient.sendEmail(user.getEmail(), subject, htmlBody, pdfBytes, attachmentName);
                        } else {
                            emailClient.sendEmail(user.getEmail(), subject, htmlBody);
                        }
                    } catch (Exception e) {
                        log.error("Failed to send email for order {} to {}", order.getOrderNumber(), user.getEmail(), e);
                    }
                });
            });
        }
    }

    private String getEmailBreakoutHtml(Order order) {
        List<Map<String, Object>> items = order.getItems();
        double subtotalBeforeTax = 0.0;
        double cgstTotal = 0.0;
        double sgstTotal = 0.0;
        if (items != null) {
            for (Map<String, Object> item : items) {
                double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                double itemTotalInclTax = price * qty;
                double itemTotalTaxable = itemTotalInclTax / 1.18;
                double itemCgst = itemTotalTaxable * 0.09;
                double itemSgst = itemTotalTaxable * 0.09;
                itemTotalTaxable = Math.round(itemTotalTaxable * 100.0) / 100.0;
                itemCgst = Math.round(itemCgst * 100.0) / 100.0;
                itemSgst = Math.round(itemSgst * 100.0) / 100.0;
                subtotalBeforeTax += itemTotalTaxable;
                cgstTotal += itemCgst;
                sgstTotal += itemSgst;
            }
        }
        double discount = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
        double grandTotal = order.getTotalAmount().doubleValue();
        double remaining = grandTotal - (subtotalBeforeTax + cgstTotal + sgstTotal - discount);
        remaining = Math.round(remaining * 100.0) / 100.0;

        double shippingCharge = 0.0;
        double codCharge = 0.0;
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

        StringBuilder sb = new StringBuilder();
        sb.append("<table width=\"100%\" cellpadding=\"4\" cellspacing=\"0\" style=\"font-size:13px;color:#475569;\">");
        sb.append("<tr><td>Subtotal (Taxable)</td><td align=\"right\">Rs. ").append(String.format("%.2f", subtotalBeforeTax)).append("</td></tr>");
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
                   (remarks != null && !remarks.isEmpty() ? "<br/>Remarks: " + remarks : "");
        } else {
            subject = "Return Request Rejected: " + order.getOrderNumber();
            body = "We regret to inform you that your return request for order <strong>" + order.getOrderNumber() + "</strong> has been rejected.<br/>" +
                   (remarks != null && !remarks.isEmpty() ? "<br/>Reason/Remarks: " + remarks : "The request does not meet our return policy guidelines.");
        }
        sendOrderEmail(order, subject, body);
    }
}
