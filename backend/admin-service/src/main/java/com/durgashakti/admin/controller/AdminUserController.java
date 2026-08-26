package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.User;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.admin.service.AdminUserService;
import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.repository.AdminSettingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final AdminUserRepository userRepository;
    private final AdminOrderRepository orderRepository;
    private final AdminSettingRepository settingRepository;
    private final com.durgashakti.admin.service.AuditLogService auditLogService;

    public AdminUserController(AdminUserService adminUserService,
                               AdminUserRepository userRepository,
                               AdminOrderRepository orderRepository,
                               AdminSettingRepository settingRepository,
                               com.durgashakti.admin.service.AuditLogService auditLogService) {
        this.adminUserService = adminUserService;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.settingRepository = settingRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping({"/users", "/customers"})
    @PreAuthorize("hasAuthority('view_customers')")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "15") int limit,
            @RequestParam(value = "search", defaultValue = "") String search,
            @RequestParam(value = "segment", required = false) String segment) {

        // Load loyalty settings
        Map<String, Object> loyaltySettings = getLoyaltySettings();
        boolean loyaltyEnabled = !Boolean.FALSE.equals(loyaltySettings.get("enabled"));
        int minOrders = ((Number) loyaltySettings.getOrDefault("minimum_orders", 10)).intValue();
        double minSpend = ((Number) loyaltySettings.getOrDefault("minimum_spend", 15000.0)).doubleValue();
        String criteriaMode = String.valueOf(loyaltySettings.getOrDefault("criteria_mode", "either"));

        // Load all orders once and group by userId
        List<Order> allOrders = orderRepository.findAll();
        Map<UUID, List<Order>> ordersByUser = allOrders.stream()
                .filter(o -> o.getUserId() != null)
                .collect(Collectors.groupingBy(Order::getUserId));

        // Load all customers
        List<User> allCustomers = userRepository.findByRoleIn(List.of("customer"));

        // Build enriched customer list with is_loyal, orders_count, total_spent
        List<Map<String, Object>> enriched = new ArrayList<>();
        long totalLoyalCount = 0;
        double totalRevenue = 0.0;

        for (User u : allCustomers) {
            String userEmailLower = u.getEmail() != null ? u.getEmail().trim().toLowerCase() : "";
            List<Order> uOrders = new ArrayList<>(ordersByUser.getOrDefault(u.getId(), List.of()));
            if (!userEmailLower.isEmpty()) {
                for (Order o : allOrders) {
                    if (o.getUserId() == null && !uOrders.contains(o)) {
                        Map<String, Object> ship = o.getShippingAddress();
                        String shipEmail = ship != null ? String.valueOf(ship.getOrDefault("email", ship.getOrDefault("user_email", ""))).trim().toLowerCase() : "";
                        if (userEmailLower.equalsIgnoreCase(shipEmail)) {
                            uOrders.add(o);
                        }
                    }
                }
            }

            long ordersCount = 0;
            double totalSpent = 0.0;
            for (Order o : uOrders) {
                String status = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
                String payStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
                boolean isCancelled = List.of("cancelled", "failed", "rejected").contains(status);
                boolean isRefunded = List.of("refunded", "refund", "failed").contains(payStatus);
                
                if (!isCancelled) {
                    ordersCount++;
                    if (!isRefunded) {
                        totalSpent += o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
                    }
                }
            }

            boolean isLoyal = false;
            if (loyaltyEnabled) {
                boolean ordersOk = ordersCount >= minOrders;
                boolean spendOk = totalSpent >= minSpend;
                if ("orders_only".equals(criteriaMode)) {
                    isLoyal = ordersOk;
                } else if ("spend_only".equals(criteriaMode)) {
                    isLoyal = spendOk;
                } else if ("both".equals(criteriaMode)) {
                    isLoyal = ordersOk && spendOk;
                } else { // "either" is default
                    isLoyal = ordersOk || spendOk;
                }
            }

            if (isLoyal) totalLoyalCount++;
            totalRevenue += totalSpent;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId().toString());
            row.put("full_name", u.getFullName() != null ? u.getFullName() : "Anonymous");
            row.put("name", u.getFullName() != null ? u.getFullName() : "Anonymous");
            row.put("email", u.getEmail());
            row.put("phone", u.getPhone() != null ? u.getPhone() : "");
            row.put("role", u.getRole());
            row.put("is_active", u.getIsActive());
            row.put("status", u.getStatus());
            row.put("created_at", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
            row.put("orders_count", ordersCount);
            row.put("total_spent", Math.round(totalSpent * 100.0) / 100.0);
            row.put("is_loyal", isLoyal);
            enriched.add(row);
        }

        // Apply search filter
        Stream<Map<String, Object>> stream = enriched.stream();
        if (search != null && !search.trim().isEmpty()) {
            String term = search.toLowerCase().trim();
            stream = stream.filter(row -> {
                String name = String.valueOf(row.getOrDefault("full_name", "")).toLowerCase();
                String email = String.valueOf(row.getOrDefault("email", "")).toLowerCase();
                String phone = String.valueOf(row.getOrDefault("phone", "")).toLowerCase();
                return name.contains(term) || email.contains(term) || phone.contains(term);
            });
        }

        // Apply segment filter
        if ("loyal".equalsIgnoreCase(segment)) {
            stream = stream.filter(row -> Boolean.TRUE.equals(row.get("is_loyal")));
        }

        // Sort by created_at descending (newest first)
        List<Map<String, Object>> filtered = stream.sorted((a, b) -> {
            String ca = String.valueOf(a.getOrDefault("created_at", ""));
            String cb = String.valueOf(b.getOrDefault("created_at", ""));
            return cb.compareTo(ca);
        }).collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<Map<String, Object>> paged = List.of();
        if (fromIndex < total) {
            paged = filtered.subList(fromIndex, Math.min(fromIndex + limit, total));
        }

        // Stats summary
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_customers", (long) allCustomers.size());
        stats.put("loyal_customers", totalLoyalCount);
        stats.put("total_spend", Math.round(totalRevenue * 100.0) / 100.0);
        stats.put("avg_spend", allCustomers.isEmpty() ? 0.0 : Math.round((totalRevenue / allCustomers.size()) * 100.0) / 100.0);

        Map<String, Object> response = new HashMap<>();
        response.put("items", paged);
        response.put("total", total);
        response.put("stats", stats);
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/users/{id}", "/customers/{id}"})
    @PreAuthorize("hasAuthority('view_customers')")
    public ResponseEntity<User> getUser(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(adminUserService.getUser(id));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasAuthority('view_customers')")
    public ResponseEntity<User> updateUser(@PathVariable("id") UUID id, @RequestBody User user) {
        User updated = adminUserService.updateUser(id, user);
        auditLogService.logAction("USER_UPDATED", "user", id.toString(),
                Map.of("email", updated.getEmail() != null ? updated.getEmail() : "N/A",
                       "role", updated.getRole() != null ? updated.getRole() : "N/A"));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('view_customers')")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") UUID id) {
        adminUserService.deleteUser(id);
        auditLogService.logAction("USER_DELETED", "user", id.toString(),
                Map.of("message", "User account deleted by admin"));
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> getLoyaltySettings() {
        Optional<Setting> sOpt = settingRepository.findById("loyalty_settings");
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("enabled", true);
        defaults.put("minimum_orders", 10);
        defaults.put("minimum_spend", 15000.0);
        defaults.put("criteria_mode", "either");
        if (sOpt.isPresent() && sOpt.get().getValue() != null) {
            defaults.putAll(sOpt.get().getValue());
        }
        return defaults;
    }
}
