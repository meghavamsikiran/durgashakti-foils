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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private final com.durgashakti.admin.service.AuditLogService auditLogService;

    public AdminCouponController(AdminCouponService adminCouponService,
                                 AdminSettingRepository settingRepository,
                                 AdminUserRepository userRepository,
                                 AdminOrderRepository orderRepository,
                                 AdminCouponRepository couponRepository,
                                 com.durgashakti.admin.service.AuditLogService auditLogService) {
        this.adminCouponService = adminCouponService;
        this.settingRepository = settingRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.couponRepository = couponRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/coupons")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<List<Coupon>> listAll() {
        return ResponseEntity.ok(adminCouponService.listAll());
    }

    @PostMapping("/coupons")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Coupon> create(@RequestBody Coupon coupon) {
        Coupon created = adminCouponService.create(coupon);
        auditLogService.logAction("COUPON_CREATED", "voucher", created.getCode() != null ? created.getCode() : created.getId().toString(),
                Map.of("code", created.getCode() != null ? created.getCode() : "N/A",
                       "discount_type", created.getDiscountType() != null ? created.getDiscountType() : "N/A",
                       "discount_value", created.getDiscountValue() != null ? created.getDiscountValue() : 0));
        return ResponseEntity.ok(created);
    }

    @PutMapping("/coupons/{id}")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Coupon> update(@PathVariable("id") UUID id, @RequestBody Coupon coupon) {
        Coupon updated = adminCouponService.update(id, coupon);
        auditLogService.logAction("COUPON_UPDATED", "voucher", updated.getCode() != null ? updated.getCode() : id.toString(),
                Map.of("code", updated.getCode() != null ? updated.getCode() : "N/A",
                       "is_active", Boolean.TRUE.equals(updated.getIsActive()),
                       "discount_value", updated.getDiscountValue() != null ? updated.getDiscountValue() : 0));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/coupons/{id}")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        adminCouponService.delete(id);
        auditLogService.logAction("COUPON_DELETED", "voucher", id.toString(),
                Map.of("message", "Coupon deleted by admin"));
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
        auditLogService.logAction("COUPON_SETTINGS_UPDATED", "setting", "coupon_settings", req);
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

    @GetMapping("/coupons/{id}/export")
    @PreAuthorize("hasAuthority('manage_coupons')")
    public ResponseEntity<byte[]> exportCoupon(@PathVariable("id") UUID id) throws java.io.IOException {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new com.durgashakti.common.exception.ApiException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Coupon not found"));

        // Find all orders that used this coupon
        List<Order> allOrders = orderRepository.findAll();
        List<Order> couponOrders = allOrders.stream()
                .filter(o -> {
                    if (coupon.getCode() == null || o.getCouponCodes() == null) return false;
                    return o.getCouponCodes().stream()
                            .anyMatch(code -> coupon.getCode().equalsIgnoreCase(code));
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            // ── Sheet 1: Coupon Summary ─────────────────────────────
            Sheet summarySheet = workbook.createSheet("Coupon Summary");
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] summaryFields = {
                "Coupon Code", "Discount Type", "Discount Value", "Min Cart Value",
                "Max Discount Limit", "Max Usage Count", "Per Customer Limit",
                "Coupon Type", "Reusable", "Active", "Total Uses",
                "Revenue Generated", "Total Discount Given", "Expiry Date"
            };
            Row summaryHeader = summarySheet.createRow(0);
            for (int i = 0; i < summaryFields.length; i++) {
                Cell cell = summaryHeader.createCell(i);
                cell.setCellValue(summaryFields[i]);
                cell.setCellStyle(headerStyle);
            }
            Row summaryRow = summarySheet.createRow(1);
            summaryRow.createCell(0).setCellValue(coupon.getCode() != null ? coupon.getCode() : "");
            summaryRow.createCell(1).setCellValue(coupon.getDiscountType() != null ? coupon.getDiscountType() : "");
            summaryRow.createCell(2).setCellValue(coupon.getDiscountValue() != null ? coupon.getDiscountValue().doubleValue() : 0);
            summaryRow.createCell(3).setCellValue(coupon.getMinCartValue() != null ? coupon.getMinCartValue().doubleValue() : 0);
            summaryRow.createCell(4).setCellValue(coupon.getMaxDiscountLimit() != null ? coupon.getMaxDiscountLimit().doubleValue() : 0);
            summaryRow.createCell(5).setCellValue(coupon.getMaxUsageCount() != null ? coupon.getMaxUsageCount() : 0);
            summaryRow.createCell(6).setCellValue(coupon.getPerCustomerUsageLimit() != null ? coupon.getPerCustomerUsageLimit() : 0);
            summaryRow.createCell(7).setCellValue(coupon.getCouponType() != null ? coupon.getCouponType() : "standard");
            summaryRow.createCell(8).setCellValue(Boolean.TRUE.equals(coupon.getIsReusable()) ? "Yes" : "No");
            summaryRow.createCell(9).setCellValue(Boolean.TRUE.equals(coupon.getIsActive()) ? "Yes" : "No");
            summaryRow.createCell(10).setCellValue(coupon.getTotalUses() != null ? coupon.getTotalUses() : 0);
            summaryRow.createCell(11).setCellValue(coupon.getRevenueGenerated() != null ? coupon.getRevenueGenerated().doubleValue() : 0);
            summaryRow.createCell(12).setCellValue(coupon.getTotalDiscountGiven() != null ? coupon.getTotalDiscountGiven().doubleValue() : 0);
            summaryRow.createCell(13).setCellValue(coupon.getExpiryDate() != null ? coupon.getExpiryDate().toString() : "Never");
            for (int i = 0; i < summaryFields.length; i++) summarySheet.autoSizeColumn(i);

            // ── Sheet 2: Order Usage ────────────────────────────────
            Sheet usageSheet = workbook.createSheet("Order Usage");
            String[] usageFields = {
                "Order Number", "Customer Name", "Order Date", "Order Total (₹)",
                "Discount Applied (₹)", "Order Status", "Payment Status"
            };
            Row usageHeader = usageSheet.createRow(0);
            for (int i = 0; i < usageFields.length; i++) {
                Cell cell = usageHeader.createCell(i);
                cell.setCellValue(usageFields[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowNum = 1;
            for (Order o : couponOrders) {
                Row row = usageSheet.createRow(rowNum++);
                row.createCell(0).setCellValue(o.getOrderNumber() != null ? o.getOrderNumber() : "");
                row.createCell(1).setCellValue(o.getCustomerName() != null ? o.getCustomerName() : "");
                row.createCell(2).setCellValue(o.getCreatedAt() != null ? o.getCreatedAt().toString() : "");
                row.createCell(3).setCellValue(o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0);
                row.createCell(4).setCellValue(o.getDiscountAmount() != null ? o.getDiscountAmount().doubleValue() : 0);
                row.createCell(5).setCellValue(o.getOrderStatus() != null ? o.getOrderStatus() : "");
                row.createCell(6).setCellValue(o.getPaymentStatus() != null ? o.getPaymentStatus() : "");
            }
            for (int i = 0; i < usageFields.length; i++) usageSheet.autoSizeColumn(i);

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            byte[] bytes = out.toByteArray();

            String filename = "coupon_" + coupon.getCode() + "_report.xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(bytes.length);
            return ResponseEntity.ok().headers(headers).body(bytes);
        }
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
