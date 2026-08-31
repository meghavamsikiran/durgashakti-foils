package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.AuditLog;
import com.durgashakti.common.entity.User;
import com.durgashakti.admin.service.AdminOrderService;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.service.GstService;
import com.durgashakti.admin.repository.AuditLogRepository;
import com.durgashakti.admin.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminOrderController {

    private static final Logger log = LoggerFactory.getLogger(AdminOrderController.class);

    private final AdminOrderService adminOrderService;
    private final AdminOrderRepository orderRepository;
    private final GstService gstService;
    private final AuditLogRepository auditLogRepository;
    private final AdminUserRepository userRepository;

    public AdminOrderController(AdminOrderService adminOrderService,
                                AdminOrderRepository orderRepository,
                                GstService gstService,
                                AuditLogRepository auditLogRepository,
                                AdminUserRepository userRepository) {
        this.adminOrderService = adminOrderService;
        this.orderRepository = orderRepository;
        this.gstService = gstService;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> getAllOrders(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status_filter", required = false) String statusFilter,
            @RequestParam(value = "start_date", required = false) String startDateStr,
            @RequestParam(value = "end_date", required = false) String endDateStr,
            @RequestParam(value = "courier", required = false) String courier,
            @RequestParam(value = "payment_status", required = false) String paymentStatus,
            @RequestParam(value = "payment_method", required = false) String paymentMethod) {

        List<Order> allOrders = adminOrderService.getAllOrders();

        List<Order> filtered = allOrders.stream()
                .filter(o -> {
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchNum = o.getOrderNumber() != null && o.getOrderNumber().toLowerCase().contains(term);
                        boolean matchCust = o.getCustomerName() != null && o.getCustomerName().toLowerCase().contains(term);
                        if (!matchNum && !matchCust) return false;
                    }
                    if (statusFilter != null && !statusFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusFilter)) {
                        if (o.getOrderStatus() == null || !o.getOrderStatus().equalsIgnoreCase(statusFilter)) {
                            return false;
                        }
                    }
                    if (startDateStr != null && !startDateStr.trim().isEmpty()) {
                        try {
                            OffsetDateTime sd = OffsetDateTime.parse(startDateStr);
                            if (o.getCreatedAt() == null || o.getCreatedAt().isBefore(sd)) return false;
                        } catch (Exception ignored) {}
                    }
                    if (endDateStr != null && !endDateStr.trim().isEmpty()) {
                        try {
                            OffsetDateTime ed = OffsetDateTime.parse(endDateStr);
                            if (o.getCreatedAt() == null || o.getCreatedAt().isAfter(ed)) return false;
                        } catch (Exception ignored) {}
                    }
                    if (courier != null && !courier.trim().isEmpty()) {
                        if (o.getCarrier() == null || !o.getCarrier().equalsIgnoreCase(courier)) return false;
                    }
                    if (paymentStatus != null && !paymentStatus.trim().isEmpty()) {
                        if (o.getPaymentStatus() == null || !o.getPaymentStatus().equalsIgnoreCase(paymentStatus)) return false;
                    }
                    if (paymentMethod != null && !paymentMethod.trim().isEmpty()) {
                        if (o.getPaymentMethod() == null || !o.getPaymentMethod().equalsIgnoreCase(paymentMethod)) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<Order> paginated;
        if (fromIndex >= total) {
            paginated = Collections.emptyList();
        } else {
            paginated = filtered.subList(fromIndex, Math.min(fromIndex + limit, total));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("items", paginated);
        response.put("total", total);
        response.put("page", page);
        response.put("limit", limit);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders/{orderId}")
    @PreAuthorize("hasAuthority('view_order_details')")
    public ResponseEntity<Order> getOrderDetails(@PathVariable("orderId") UUID orderId) {
        return ResponseEntity.ok(adminOrderService.getOrderDetails(orderId));
    }

    @PutMapping("/orders/{orderId}/status")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        String carrier = payload.get("carrier");
        String trackingNumber = payload.get("tracking_number");
        String expectedDeliveryDate = payload.get("expected_delivery_date");
        String shipmentNotes = payload.get("shipment_notes");
        
        if (carrier != null || trackingNumber != null || expectedDeliveryDate != null || shipmentNotes != null) {
            return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, status, carrier, trackingNumber, expectedDeliveryDate, shipmentNotes));
        }
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, status));
    }

    @PutMapping("/orders/{orderId}/ship")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Order> shipOrder(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String carrier = payload.get("carrier");
        String trackingNumber = payload.get("tracking_number");
        return ResponseEntity.ok(adminOrderService.shipOrder(orderId, carrier, trackingNumber));
    }

    // ── Bulk Ship Orders ──
    @PostMapping("/orders/bulk-ship")
    @PreAuthorize("hasAuthority('view_orders')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> bulkShipOrders(@RequestBody Map<String, Object> payload) {
        List<Map<String, String>> shipments = (List<Map<String, String>>) payload.get("orders");
        if (shipments == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing 'orders' array"));
        }
        Map<String, Object> response = adminOrderService.bulkShipOrders(shipments);
        return ResponseEntity.ok(response);
    }

    // ── Item Return/Exchange Action (approve or reject) ──────────────────
    @PostMapping("/orders/{orderId}/items/{productId}/return-action")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> itemReturnAction(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId,
            @RequestBody Map<String, String> payload) {
        String action = payload.get("action");
        String remarks = payload.get("remarks");
        Order order = adminOrderService.itemReturnAction(orderId, productId, action, remarks);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item return " + action + "d successfully");
        response.put("order", order);
        return ResponseEntity.ok(response);
    }

    // ── Mark Returned Item as Received ────────────────────────────────────
    @PostMapping("/orders/{orderId}/items/{productId}/receive")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> receiveReturnedItem(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId) {
        Order order = adminOrderService.receiveReturnedItem(orderId, productId);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item marked as received");
        response.put("order", order);
        return ResponseEntity.ok(response);
    }

    // ── Process Refund for a Returned Item ────────────────────────────────
    @PostMapping("/orders/{orderId}/items/{productId}/process-refund")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<?> processItemRefund(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId,
            @RequestParam(value = "restock", defaultValue = "true") boolean restock,
            @RequestParam(value = "manual_amount", required = false) Double manualAmount,
            @RequestParam(value = "payment_id", required = false) String paymentId,
            @RequestParam(value = "is_manual", defaultValue = "false") boolean isManual) {
        try {
            if (paymentId != null && !paymentId.isBlank()) {
                try {
                    orderRepository.findById(orderId).ifPresent(o -> {
                        o.setRazorpayPaymentId(paymentId.trim());
                        orderRepository.save(o);
                    });
                } catch (Exception ignored) {}
            }
            Order order = adminOrderService.processItemRefund(orderId, productId, restock, manualAmount, isManual);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Refund processed successfully");
            response.put("order", order);

            if (order != null && order.getItems() != null) {
                for (Map<String, Object> item : order.getItems()) {
                    if (productId.equalsIgnoreCase(String.valueOf(item.get("product_id")))) {
                        String rStatus = (String) item.get("return_status");
                        if ("REFUND_FAILED".equalsIgnoreCase(rStatus)) {
                            @SuppressWarnings("unchecked")
                            List<Map<String, Object>> timeline = (List<Map<String, Object>>) item.get("audit_timeline");
                            if (timeline != null && !timeline.isEmpty()) {
                                String lastNote = (String) timeline.get(timeline.size() - 1).get("note");
                                if (lastNote != null && !lastNote.isBlank()) {
                                    response.put("warning", lastNote);
                                }
                            }
                        }
                        break;
                    }
                }
            }
            return ResponseEntity.ok(response);
        } catch (com.durgashakti.common.exception.ApiException e) {
            log.warn("[Process Item Refund ApiException] Order ID: {}, Product ID: {}: {}", orderId, productId, e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("[Process Item Refund Error] Order ID: {}, Product ID: {}", orderId, productId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to process item refund. Please try again later."));
        }
    }

    // ── Retry Refund for a Failed Refund ──
    @PostMapping("/orders/{orderId}/items/{productId}/retry-refund")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> retryRefund(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId) {
        Order order = adminOrderService.retryRefund(orderId, productId);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Refund retry processed successfully");
        response.put("order", order);
        return ResponseEntity.ok(response);
    }

    // ── Ship Exchange Replacement Item ────────────────────────────────────
    @PostMapping("/orders/{orderId}/items/{productId}/ship-exchange")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> shipExchangeItem(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId,
            @RequestBody Map<String, String> payload) {
        String courier = payload.get("exchange_courier_name");
        String trackingNumber = payload.get("exchange_tracking_number");
        String expectedDeliveryDate = payload.get("exchange_expected_delivery_date");
        String notes = payload.get("exchange_shipment_notes");
        Order order = adminOrderService.shipExchangeItem(orderId, productId, courier, trackingNumber, expectedDeliveryDate, notes);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Exchange item shipped successfully");
        response.put("order", order);
        return ResponseEntity.ok(response);
    }

    // ── Complete Exchange (delivery confirmed) ───────────────────────────
    @PostMapping("/orders/{orderId}/items/{productId}/complete-exchange")
    @PreAuthorize("hasAuthority('view_orders')")
    public ResponseEntity<Map<String, Object>> completeExchangeItem(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") String productId) {
        Order order = adminOrderService.completeExchangeItem(orderId, productId);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Exchange item completed successfully");
        response.put("order", order);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gstr1/export")
    @PreAuthorize("hasAuthority('view_gst_reports')")
    public ResponseEntity<byte[]> exportGstReport() throws IOException {
        byte[] excelBytes = gstService.exportGstReport();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gstr1_report.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(excelBytes);
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAuthority('view_transactions')")
    public ResponseEntity<Map<String, Object>> getPayments(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "start_date", required = false) String startDateStr,
            @RequestParam(value = "end_date", required = false) String endDateStr) {

        List<Order> allOrders = adminOrderService.getAllOrders();

        List<Order> filtered = allOrders.stream()
                .filter(o -> {
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchesNum = o.getOrderNumber() != null && o.getOrderNumber().toLowerCase().contains(term);
                        boolean matchesRPay = o.getRazorpayPaymentId() != null && o.getRazorpayPaymentId().toLowerCase().contains(term);
                        boolean matchesROrd = o.getRazorpayOrderId() != null && o.getRazorpayOrderId().toLowerCase().contains(term);
                        if (!matchesNum && !matchesRPay && !matchesROrd) {
                            return false;
                        }
                    }
                    if (startDateStr != null && !startDateStr.trim().isEmpty()) {
                        try {
                            OffsetDateTime sd = OffsetDateTime.parse(startDateStr);
                            if (o.getCreatedAt() == null || o.getCreatedAt().isBefore(sd)) {
                                return false;
                            }
                        } catch (Exception ignored) {}
                    }
                    if (endDateStr != null && !endDateStr.trim().isEmpty()) {
                        try {
                            OffsetDateTime ed = OffsetDateTime.parse(endDateStr);
                            if (o.getCreatedAt() == null || o.getCreatedAt().isAfter(ed)) {
                                return false;
                            }
                        } catch (Exception ignored) {}
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<Order> paginated;
        if (fromIndex >= total) {
            paginated = Collections.emptyList();
        } else {
            paginated = filtered.subList(fromIndex, Math.min(fromIndex + limit, total));
        }

        List<Map<String, Object>> items = paginated.stream()
                .map(o -> {
                    Map<String, Object> item = new HashMap<>();
                    boolean isCod = "cod".equalsIgnoreCase(o.getPaymentMethod());
                    String txId = "COD";
                    if (!isCod) {
                        txId = o.getRazorpayPaymentId() != null ? o.getRazorpayPaymentId() : o.getRazorpayOrderId();
                    } else {
                        if (o.getRazorpayPaymentId() != null) txId = o.getRazorpayPaymentId();
                        else if (o.getRazorpayOrderId() != null) txId = o.getRazorpayOrderId();
                    }

                    item.put("id", o.getId().toString());
                    item.put("order_number", o.getOrderNumber());
                    item.put("transaction_id", txId != null ? txId : "COD");
                    item.put("amount", o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0);
                    item.put("status", getPaymentStatusLabel(o.getPaymentStatus()));
                    item.put("raw_status", o.getPaymentStatus());
                    item.put("provider", isCod ? "COD" : "Prepaid");
                    item.put("created_at", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                    return item;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("total", total);
        response.put("page", page);
        response.put("limit", limit);

        return ResponseEntity.ok(response);
    }

    private String getPaymentStatusLabel(String status) {
        if (status == null) return "pending";
        String val = status.toLowerCase();
        if (val.contains("paid") || val.contains("completed")) {
            return "completed";
        }
        if (val.contains("cash on delivery") || val.contains("cod")) {
            return "cod";
        }
        if (val.contains("refund_pending") || val.contains("refund_initiated")) {
            return "refund_pending";
        }
        if (val.contains("refunded")) {
            return "refunded";
        }
        if (val.contains("failed") || val.contains("cancelled")) {
            return "failed";
        }
        return "pending";
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('view_audit_logs')")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @RequestParam(value = "search", required = false) String search) {

        List<AuditLog> allLogs = auditLogRepository.findAll();
        List<User> allUsers = userRepository.findByRoleIn(List.of("admin", "SUPER_ADMIN", "customer"));
        Map<String, User> userMap = new HashMap<>();
        for (User u : allUsers) {
            if (u.getId() != null) userMap.put(u.getId().toString(), u);
            if (u.getEmail() != null) userMap.put(u.getEmail().toLowerCase().trim(), u);
        }

        List<AuditLog> filtered = allLogs.stream()
                .filter(log -> {
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchAction = log.getAction() != null && log.getAction().toLowerCase().contains(term);
                        boolean matchActor = log.getActorId() != null && log.getActorId().toLowerCase().contains(term);
                        boolean matchTarget = log.getTargetId() != null && log.getTargetId().toLowerCase().contains(term);
                        boolean matchType = log.getTargetType() != null && log.getTargetType().toLowerCase().contains(term);
                        if (!matchAction && !matchActor && !matchTarget && !matchType) {
                            return false;
                        }
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<AuditLog> paginated;
        if (fromIndex >= total) {
            paginated = Collections.emptyList();
        } else {
            paginated = filtered.subList(fromIndex, Math.min(fromIndex + limit, total));
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (AuditLog logEntry : paginated) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", logEntry.getId().toString());
            item.put("action", logEntry.getAction());
            item.put("actor_id", logEntry.getActorId());
            item.put("target_type", logEntry.getTargetType());
            item.put("target_id", logEntry.getTargetId());
            item.put("metadata", logEntry.getMetadata());
            item.put("created_at", logEntry.getCreatedAt() != null ? logEntry.getCreatedAt().toString() : null);

            String actorId = logEntry.getActorId();
            User user = (actorId != null) ? userMap.get(actorId.toLowerCase().trim()) : null;
            if (user == null && logEntry.getMetadata() != null && logEntry.getMetadata().get("actor_email") != null) {
                user = userMap.get(String.valueOf(logEntry.getMetadata().get("actor_email")).toLowerCase().trim());
            }

            String name = "System Process";
            String role = "SYSTEM";
            String roleLabel = "SYSTEM";
            String email = "";

            if (user != null) {
                name = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getEmail();
                email = user.getEmail() != null ? user.getEmail() : "";
                role = user.getRole();
                roleLabel = getRoleLabelForAudit(user);
            } else if (logEntry.getMetadata() != null) {
                Map<String, Object> meta = logEntry.getMetadata();
                if (meta.get("actor_name") != null) name = String.valueOf(meta.get("actor_name"));
                if (meta.get("actor_email") != null) email = String.valueOf(meta.get("actor_email"));
                if (meta.get("actor_role") != null) role = String.valueOf(meta.get("actor_role"));
                if (meta.get("actor_role_label") != null) roleLabel = String.valueOf(meta.get("actor_role_label"));
                else if (role != null) roleLabel = role.replace("_", " ").toUpperCase();
            }

            item.put("actor_name", name);
            item.put("actor_email", email);
            item.put("actor_role", role);
            item.put("actor_role_label", roleLabel);
            item.put("updated_by_name_role", name + " (" + roleLabel + ")");

            items.add(item);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("total", total);
        response.put("page", page);
        response.put("limit", limit);

        return ResponseEntity.ok(response);
    }

    private String getRoleLabelForAudit(User user) {
        if ("SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            return "Super Admin";
        }
        Map<String, Object> perms = user.getPermissions();
        if (perms != null && perms.get("role_template") != null) {
            String template = String.valueOf(perms.get("role_template")).trim().toUpperCase().replace(" ", "_");
            switch (template) {
                case "OPERATIONS_ADMIN": return "Operations Admin";
                case "ORDER_MANAGER": return "Order Manager";
                case "PRODUCT_MANAGER": return "Product Manager";
                case "INVENTORY_MANAGER": return "Inventory Manager";
                case "CUSTOMER_SUPPORT": return "Customer Support";
                case "SHIPPING_MANAGER": return "Shipping Manager";
                case "FINANCE_ADMIN": return "Finance Admin";
                case "ANALYTICS_VIEWER": return "Analytics Viewer";
                default: return "Custom Admin";
            }
        }
        return "Custom Admin";
    }
}
