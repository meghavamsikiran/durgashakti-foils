package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.User;
import com.durgashakti.admin.service.AdminCouponService;
import com.durgashakti.admin.repository.AdminSettingRepository;
import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.admin.repository.AdminCouponRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminCouponController {

    private final AdminCouponService adminCouponService;
    private final AdminSettingRepository settingRepository;
    private final AdminUserRepository userRepository;
    private final AdminOrderRepository orderRepository;
    private final AdminCouponRepository couponRepository;

    public AdminCouponController(AdminCouponService adminCouponService,
                                 AdminSettingRepository settingRepository,
                                 AdminUserRepository userRepository,
                                 AdminOrderRepository orderRepository,
                                 AdminCouponRepository couponRepository) {
        this.adminCouponService = adminCouponService;
        this.settingRepository = settingRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.couponRepository = couponRepository;
    }

    @GetMapping("/coupons")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<List<Coupon>> listAll() {
        return ResponseEntity.ok(adminCouponService.listAll());
    }

    @PostMapping("/coupons")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Coupon> create(@RequestBody Coupon coupon) {
        return ResponseEntity.ok(adminCouponService.create(coupon));
    }

    @PutMapping("/coupons/{id}")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Coupon> update(@PathVariable("id") UUID id, @RequestBody Coupon coupon) {
        return ResponseEntity.ok(adminCouponService.update(id, coupon));
    }

    @DeleteMapping("/coupons/{id}")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        adminCouponService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/coupons/settings")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Map<String, Object>> getSettings() {
        Optional<Setting> sOpt = settingRepository.findById("coupon_settings");
        Map<String, Object> defaultSettings = new HashMap<>();
        defaultSettings.put("system_enabled", true);
        defaultSettings.put("stacking_enabled", false);
        defaultSettings.put("single_use_per_account", false);

        if (sOpt.isPresent() && sOpt.get().getValue() != null) {
            defaultSettings.putAll(sOpt.get().getValue());
        }
        return ResponseEntity.ok(defaultSettings);
    }

    @PostMapping("/coupons/settings")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Map<String, String>> saveSettings(@RequestBody Map<String, Object> req) {
        Optional<Setting> sOpt = settingRepository.findById("coupon_settings");
        Setting s = sOpt.orElseGet(() -> {
            Setting newS = new Setting();
            newS.setKey("coupon_settings");
            return newS;
        });
        s.setValue(req);
        s.setUpdatedAt(OffsetDateTime.now());
        settingRepository.save(s);
        return ResponseEntity.ok(Map.of("message", "Coupon settings updated successfully"));
    }

    @GetMapping("/coupons/loyal-customers")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Map<String, Object>> listLoyalCustomers(
            @RequestParam(value = "search", defaultValue = "") String search) {
        
        Map<String, Object> settings = getLoyaltySettings();
        boolean enabled = !Boolean.FALSE.equals(settings.get("enabled"));
        int minOrders = ((Number) settings.getOrDefault("minimum_orders", 10)).intValue();
        double minSpend = ((Number) settings.getOrDefault("minimum_spend", 15000.0)).doubleValue();
        String criteriaMode = String.valueOf(settings.getOrDefault("criteria_mode", "either"));

        List<User> customers = userRepository.findByRoleIn(List.of("customer"));
        List<Order> allOrders = orderRepository.findAll();
        
        Map<UUID, List<Order>> ordersByUser = allOrders.stream()
                .filter(o -> o.getUserId() != null)
                .collect(Collectors.groupingBy(Order::getUserId));

        List<Map<String, Object>> items = new ArrayList<>();

        for (User u : customers) {
            if (search != null && !search.trim().isEmpty()) {
                String term = search.toLowerCase().trim();
                boolean nameMatch = u.getFullName() != null && u.getFullName().toLowerCase().contains(term);
                boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(term);
                boolean phoneMatch = u.getPhone() != null && u.getPhone().toLowerCase().contains(term);
                if (!nameMatch && !emailMatch && !phoneMatch) {
                    continue;
                }
            }

            List<Order> uOrders = ordersByUser.getOrDefault(u.getId(), List.of());
            long ordersCount = 0;
            double totalSpent = 0.0;
            for (Order o : uOrders) {
                String status = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
                String payStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
                
                if ("delivered".equals(status) && !List.of("refunded", "refund", "failed").contains(payStatus)) {
                    ordersCount++;
                    totalSpent += o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
                }
            }

            boolean isLoyal = false;
            if (enabled) {
                boolean ordersOk = ordersCount >= minOrders;
                boolean spendOk = totalSpent >= minSpend;
                
                if ("orders_only".equals(criteriaMode)) {
                    isLoyal = ordersOk;
                } else if ("spend_only".equals(criteriaMode)) {
                    isLoyal = spendOk;
                } else if ("both".equals(criteriaMode)) {
                    isLoyal = ordersOk && spendOk;
                } else { 
                    isLoyal = ordersOk || spendOk;
                }
            }

            if (isLoyal) {
                Map<String, Object> uMap = new HashMap<>();
                uMap.put("id", u.getId().toString());
                uMap.put("name", u.getFullName() != null ? u.getFullName() : u.getEmail());
                uMap.put("email", u.getEmail());
                uMap.put("phone", u.getPhone() != null ? u.getPhone() : "");
                uMap.put("orders_count", ordersCount);
                uMap.put("total_spent", Math.round(totalSpent * 100.0) / 100.0);
                items.add(uMap);
            }
        }

        items.sort((a, b) -> Double.compare(
                ((Number) b.get("total_spent")).doubleValue(),
                ((Number) a.get("total_spent")).doubleValue()
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("criteria", settings);
        response.put("total", items.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/coupons/analytics")
    public ResponseEntity<Map<String, Object>> getCouponAnalytics() {
        Map<String, Object> settings = getLoyaltySettings();
        boolean enabled = !Boolean.FALSE.equals(settings.get("enabled"));
        int minOrders = ((Number) settings.getOrDefault("minimum_orders", 10)).intValue();
        double minSpend = ((Number) settings.getOrDefault("minimum_spend", 15000.0)).doubleValue();
        String criteriaMode = String.valueOf(settings.getOrDefault("criteria_mode", "either"));

        List<Coupon> coupons = couponRepository.findAll();
        long totalCouponUsage = 0;
        double totalDiscountGiven = 0.0;
        double revenueGenerated = 0.0;
        long loyaltyCouponCount = 0;

        for (Coupon c : coupons) {
            totalCouponUsage += c.getTotalUses() != null ? c.getTotalUses() : 0;
            totalDiscountGiven += c.getTotalDiscountGiven() != null ? c.getTotalDiscountGiven().doubleValue() : 0.0;
            
            if ("loyalty".equalsIgnoreCase(c.getCouponType())) {
                loyaltyCouponCount++;
                revenueGenerated += c.getRevenueGenerated() != null ? c.getRevenueGenerated().doubleValue() : 0.0;
            }
        }

        List<User> customers = userRepository.findByRoleIn(List.of("customer"));
        List<Order> allOrders = orderRepository.findAll();
        Map<UUID, List<Order>> ordersByUser = allOrders.stream()
                .filter(o -> o.getUserId() != null)
                .collect(Collectors.groupingBy(Order::getUserId));

        List<Map<String, Object>> allCustomerStats = new ArrayList<>();
        long activeLoyalCustomerCount = 0;

        for (User u : customers) {
            List<Order> uOrders = ordersByUser.getOrDefault(u.getId(), List.of());
            long ordersCount = 0;
            double totalSpent = 0.0;
            for (Order o : uOrders) {
                String status = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
                String payStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
                
                if ("delivered".equals(status) && !List.of("refunded", "refund", "failed").contains(payStatus)) {
                    ordersCount++;
                    totalSpent += o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
                }
            }

            boolean isLoyal = false;
            if (enabled) {
                boolean ordersOk = ordersCount >= minOrders;
                boolean spendOk = totalSpent >= minSpend;
                
                if ("orders_only".equals(criteriaMode)) {
                    isLoyal = ordersOk;
                } else if ("spend_only".equals(criteriaMode)) {
                    isLoyal = spendOk;
                } else if ("both".equals(criteriaMode)) {
                    isLoyal = ordersOk && spendOk;
                } else { 
                    isLoyal = ordersOk || spendOk;
                }
            }

            if (isLoyal) {
                activeLoyalCustomerCount++;
                
                Map<String, Object> uMap = new HashMap<>();
                uMap.put("id", u.getId().toString());
                uMap.put("name", u.getFullName() != null ? u.getFullName() : u.getEmail());
                uMap.put("email", u.getEmail());
                uMap.put("orders_count", ordersCount);
                uMap.put("total_spent", Math.round(totalSpent * 100.0) / 100.0);
                allCustomerStats.add(uMap);
            }
        }

        allCustomerStats.sort((a, b) -> Double.compare(
                ((Number) b.get("total_spent")).doubleValue(),
                ((Number) a.get("total_spent")).doubleValue()
        ));
        List<Map<String, Object>> topLoyal = allCustomerStats.stream().limit(5).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("total_coupon_usage", totalCouponUsage);
        response.put("total_discount_given", Math.round(totalDiscountGiven * 100.0) / 100.0);
        response.put("revenue_generated", Math.round(revenueGenerated * 100.0) / 100.0);
        response.put("active_loyal_customer_count", activeLoyalCustomerCount);
        response.put("top_loyal_customers", topLoyal);
        response.put("loyalty_coupon_count", loyaltyCouponCount);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> getLoyaltySettings() {
        Optional<Setting> settingOpt = settingRepository.findById("loyalty_settings");
        Map<String, Object> settings = new HashMap<>();
        settings.put("enabled", true);
        settings.put("minimum_orders", 10);
        settings.put("minimum_spend", 15000.0);
        settings.put("criteria_mode", "either");

        if (settingOpt.isPresent() && settingOpt.get().getValue() != null) {
            settings.putAll(settingOpt.get().getValue());
        }
        return settings;
    }
}
