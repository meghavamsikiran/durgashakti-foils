package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.AuditLog;
import com.durgashakti.common.entity.User;
import com.durgashakti.admin.service.AdminOrderService;
import com.durgashakti.admin.service.GstService;
import com.durgashakti.admin.repository.AuditLogRepository;
import com.durgashakti.admin.repository.AdminUserRepository;
import org.springframework.http.HttpHeaders;
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

    private final AdminOrderService adminOrderService;
    private final GstService gstService;
    private final AuditLogRepository auditLogRepository;
    private final AdminUserRepository userRepository;

    public AdminOrderController(AdminOrderService adminOrderService,
                                GstService gstService,
                                AuditLogRepository auditLogRepository,
                                AdminUserRepository userRepository) {
        this.adminOrderService = adminOrderService;
        this.gstService = gstService;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/orders")
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
    public ResponseEntity<Order> getOrderDetails(@PathVariable("orderId") UUID orderId) {
        return ResponseEntity.ok(adminOrderService.getOrderDetails(orderId));
    }

    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, status));
    }

    @PutMapping("/orders/{orderId}/ship")
    public ResponseEntity<Order> shipOrder(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String carrier = payload.get("carrier");
        String trackingNumber = payload.get("tracking_number");
        return ResponseEntity.ok(adminOrderService.shipOrder(orderId, carrier, trackingNumber));
    }

    @GetMapping("/gstr1/export")
    public ResponseEntity<byte[]> exportGstReport() throws IOException {
        byte[] excelBytes = gstService.exportGstReport();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gstr1_report.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(excelBytes);
    }

    @GetMapping("/payments")
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
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @RequestParam(value = "search", required = false) String search) {

        List<AuditLog> allLogs = auditLogRepository.findAll();
        List<User> allUsers = userRepository.findByRoleIn(List.of("admin", "SUPER_ADMIN", "customer"));
        Map<String, User> userMap = allUsers.stream()
                .collect(Collectors.toMap(u -> u.getId().toString(), u -> u, (a, b) -> a));

        List<AuditLog> filtered = allLogs.stream()
                .filter(log -> {
                    String actorId = log.getActorId();
                    if (actorId != null && !actorId.trim().isEmpty()) {
                        User actor = userMap.get(actorId);
                        if (actor != null && "customer".equalsIgnoreCase(actor.getRole())) {
                            return false;
                        }
                    }
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchAction = log.getAction() != null && log.getAction().toLowerCase().contains(term);
                        boolean matchActor = log.getActorId() != null && log.getActorId().toLowerCase().contains(term);
                        boolean matchTarget = log.getTargetId() != null && log.getTargetId().toLowerCase().contains(term);
                        if (!matchAction && !matchActor && !matchTarget) {
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
            User user = (actorId != null) ? userMap.get(actorId) : null;
            String name = "System Process";
            String role = "SYSTEM";
            String roleLabel = "SYSTEM";

            if (user != null) {
                name = user.getFullName() != null ? user.getFullName() : (user.getEmail() != null ? user.getEmail() : "Unknown");
                role = user.getRole();
                roleLabel = getRoleLabelForAudit(user);
            } else if (logEntry.getMetadata() != null) {
                Map<String, Object> meta = logEntry.getMetadata();
                if (meta.get("actor_name") != null) name = String.valueOf(meta.get("actor_name"));
                if (meta.get("actor_role") != null) role = String.valueOf(meta.get("actor_role"));
                if (meta.get("actor_role_label") != null) roleLabel = String.valueOf(meta.get("actor_role_label"));
            }

            item.put("actor_name", name);
            item.put("actor_email", user != null ? user.getEmail() : "");
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
