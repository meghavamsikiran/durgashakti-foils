package com.durgashakti.admin.service;

import com.durgashakti.common.entity.AuditLog;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.Product;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.repository.AdminProductRepository;
import com.durgashakti.admin.repository.AuditLogRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class AdminOrderServiceImpl implements AdminOrderService {

    private final AdminOrderRepository orderRepository;
    private final AdminProductRepository productRepository;
    private final AuditLogRepository auditLogRepository;

    public AdminOrderServiceImpl(AdminOrderRepository orderRepository,
                                 AdminProductRepository productRepository,
                                 AuditLogRepository auditLogRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.auditLogRepository = auditLogRepository;
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
        return orderRepository.save(order);
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
        return orderRepository.save(order);
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

        return orderRepository.save(order);
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

        return orderRepository.save(order);
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

                // For now, mark as REFUND_COMPLETED (manual) or REFUND_INITIATED (automated)
                // The Python code attempts Razorpay here, but the Java monolith doesn't have
                // Razorpay SDK integration yet. We mark as REFUND_COMPLETED for manual,
                // REFUND_INITIATED for non-manual (pending Razorpay integration).
                String refundStatus = isManual ? "REFUND_COMPLETED" : "REFUND_INITIATED";
                item.put("return_status", refundStatus);

                String remark = isManual
                        ? String.format("Refund of ₹%.2f completed successfully (Manual: true)", refundAmount)
                        : String.format("Refund of ₹%.2f initiated (Manual: false)", refundAmount);
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

        writeAuditLog("ITEM_REFUND_PROCESSED", "order", orderId.toString(),
                Map.of("product_id", productId, "amount", refundAmount, "restock", restock));

        return orderRepository.save(order);
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

        return orderRepository.save(order);
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

        return orderRepository.save(order);
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
}
