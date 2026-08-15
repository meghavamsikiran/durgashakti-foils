package com.durgashakti.order.service;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.repository.OrderCouponRepository;
import com.durgashakti.order.repository.CouponUsageRepository;
import com.durgashakti.order.repository.OrderServiceRepository;
import com.durgashakti.order.repository.OrderSettingRepository;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.common.entity.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class CouponServiceImpl implements CouponService {

    private final OrderCouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderServiceRepository orderRepository;
    private final OrderSettingRepository settingRepository;

    public CouponServiceImpl(OrderCouponRepository couponRepository,
                             CouponUsageRepository couponUsageRepository,
                             OrderServiceRepository orderRepository,
                             OrderSettingRepository settingRepository) {
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
        this.orderRepository = orderRepository;
        this.settingRepository = settingRepository;
    }

    @Override
    public Map<String, Object> validateCoupons(UUID userId, List<String> codes, double subtotal) {
        // 1. Load global settings
        Optional<Setting> settingsOpt = settingRepository.findById("coupon_settings");
        boolean systemEnabled = true;
        boolean stackingEnabled = false;
        boolean singleUsePerAccount = false;

        if (settingsOpt.isPresent() && settingsOpt.get().getValue() != null) {
            Map<String, Object> val = settingsOpt.get().getValue();
            systemEnabled = !Boolean.FALSE.equals(val.get("system_enabled"));
            stackingEnabled = Boolean.TRUE.equals(val.get("stacking_enabled"));
            singleUsePerAccount = Boolean.TRUE.equals(val.get("single_use_per_account"));
        }

        if (!systemEnabled) {
            Map<String, Object> errorsMap = new HashMap<>();
            if (codes != null) {
                for (String c : codes) {
                    errorsMap.put(c, "Coupon system is currently disabled");
                }
            }
            return Map.of(
                "valid", false,
                "discount_amount", 0.0,
                "free_shipping", false,
                "error", "Coupon system is currently disabled",
                "applied_coupons", List.of(),
                "errors", errorsMap
            );
        }

        if (codes == null || codes.isEmpty()) {
            return Map.of(
                "valid", true,
                "discount_amount", 0.0,
                "free_shipping", false,
                "applied_coupons", List.of(),
                "errors", Map.of()
            );
        }

        List<String> normalizedInputCodes = new ArrayList<>();
        for (String c : codes) {
            if (c != null && !c.trim().isEmpty()) {
                normalizedInputCodes.add(c.trim().toUpperCase());
            }
        }

        if (normalizedInputCodes.isEmpty()) {
            return Map.of(
                "valid", true,
                "discount_amount", 0.0,
                "free_shipping", false,
                "applied_coupons", List.of(),
                "errors", Map.of()
            );
        }

        if (!stackingEnabled && normalizedInputCodes.size() > 1) {
            normalizedInputCodes = List.of(normalizedInputCodes.get(0));
        }

        List<Order> userOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);

        if (singleUsePerAccount) {
            boolean hasUsedCoupon = false;
            for (Order order : userOrders) {
                String st = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
                if (!List.of("cancelled", "failed", "expired").contains(st) && order.getCouponCodes() != null && !order.getCouponCodes().isEmpty()) {
                    hasUsedCoupon = true;
                    break;
                }
            }
            if (hasUsedCoupon) {
                Map<String, Object> errorsMap = new HashMap<>();
                for (String c : codes) {
                    errorsMap.put(c, "You have already used a coupon on your account");
                }
                return Map.of(
                    "valid", false,
                    "discount_amount", 0.0,
                    "free_shipping", false,
                    "error", "You have already redeemed a coupon on a past order. Only one coupon can be used per customer account.",
                    "applied_coupons", List.of(),
                    "errors", errorsMap
                );
            }
        }

        List<Coupon> appliedCoupons = new ArrayList<>();
        Map<String, String> errors = new HashMap<>();
        OffsetDateTime now = OffsetDateTime.now();
        boolean isLoyal = checkCustomerIsLoyal(userId);

        for (String rawCode : codes) {
            String codeUpper = rawCode.trim().toUpperCase();
            if (!normalizedInputCodes.contains(codeUpper)) {
                errors.put(rawCode, "Only one coupon can be used per order. Remove the applied coupon before using another code.");
                continue;
            }

            Optional<Coupon> couponOpt = couponRepository.findByCodeIgnoreCase(codeUpper);
            if (couponOpt.isEmpty()) {
                errors.put(rawCode, "Coupon code not found");
                continue;
            }

            Coupon coupon = couponOpt.get();

            if (!Boolean.TRUE.equals(coupon.getIsActive())) {
                errors.put(rawCode, "Coupon is inactive");
                continue;
            }

            if (coupon.getExpiryDate() != null && now.isAfter(coupon.getExpiryDate())) {
                errors.put(rawCode, "Coupon has expired");
                continue;
            }

            if (coupon.getMinCartValue() != null && subtotal < coupon.getMinCartValue().doubleValue()) {
                errors.put(rawCode, "Minimum cart value of ₹" + coupon.getMinCartValue() + " required");
                continue;
            }

            if (coupon.getMaxUsageCount() != null && coupon.getTotalUses() >= coupon.getMaxUsageCount()) {
                errors.put(rawCode, "Coupon usage limit reached");
                continue;
            }

            // Loyalty check
            if ("loyalty".equalsIgnoreCase(coupon.getCouponType())) {
                if (!isLoyal) {
                    errors.put(rawCode, "This coupon is reserved for loyal customers");
                    continue;
                }
                if (!Boolean.TRUE.equals(coupon.getApplyToAllLoyalCustomers())) {
                    List<String> eligibleIds = coupon.getEligibleCustomerIds();
                    if (eligibleIds == null || eligibleIds.stream().noneMatch(id -> userId.toString().equalsIgnoreCase(id))) {
                        errors.put(rawCode, "This loyal customer coupon is not assigned to your account");
                        continue;
                    }
                }
            }

            // Customer usage limit
            long usageCount = 0;
            for (Order order : userOrders) {
                String st = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
                if (!List.of("cancelled", "failed", "expired").contains(st) && order.getCouponCodes() != null) {
                    if (order.getCouponCodes().stream().anyMatch(c -> c.trim().equalsIgnoreCase(codeUpper))) {
                        usageCount++;
                    }
                }
            }

            Integer effectiveLimit = coupon.getPerCustomerUsageLimit();
            if (effectiveLimit != null && usageCount >= effectiveLimit) {
                errors.put(rawCode, "You have already redeemed this coupon code on a past order.");
                continue;
            }

            appliedCoupons.add(coupon);
        }

        double totalDiscount = 0.0;
        boolean freeShipping = false;

        for (Coupon coupon : appliedCoupons) {
            if ("percentage".equalsIgnoreCase(coupon.getDiscountType())) {
                double disc = subtotal * (coupon.getDiscountValue().doubleValue() / 100.0);
                if (coupon.getMaxDiscountLimit() != null) {
                    disc = Math.min(disc, coupon.getMaxDiscountLimit().doubleValue());
                }
                totalDiscount += disc;
            } else if ("flat".equalsIgnoreCase(coupon.getDiscountType())) {
                totalDiscount += coupon.getDiscountValue().doubleValue();
            } else if ("free_shipping".equalsIgnoreCase(coupon.getDiscountType())) {
                freeShipping = true;
            }
        }

        totalDiscount = Math.min(totalDiscount, subtotal);

        List<Map<String, Object>> appliedList = new ArrayList<>();
        for (Coupon c : appliedCoupons) {
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", c.getId().toString());
            cMap.put("code", c.getCode());
            cMap.put("discount_type", c.getDiscountType());
            cMap.put("discount_value", c.getDiscountValue());
            cMap.put("min_cart_value", c.getMinCartValue() != null ? c.getMinCartValue() : 0);
            cMap.put("max_discount_limit", c.getMaxDiscountLimit());
            cMap.put("coupon_type", c.getCouponType() != null ? c.getCouponType() : "standard");
            appliedList.add(cMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("valid", !appliedCoupons.isEmpty() || codes.isEmpty());
        response.put("discount_amount", Math.round(totalDiscount * 100.0) / 100.0);
        response.put("free_shipping", freeShipping);
        response.put("applied_coupons", appliedList);
        response.put("errors", errors);

        return response;
    }

    private boolean checkCustomerIsLoyal(UUID userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        long ordersCount = 0;
        double totalSpent = 0.0;
        
        for (Order o : orders) {
            String status = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
            String payStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            
            if ("delivered".equals(status) && !List.of("refunded", "refund", "failed").contains(payStatus)) {
                ordersCount++;
                totalSpent += o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
            }
        }

        Optional<Setting> settingOpt = settingRepository.findById("loyalty_settings");
        boolean enabled = true;
        int minOrders = 3;
        double minSpend = 5000.0;
        String criteriaMode = "either";
        
        if (settingOpt.isPresent()) {
            Map<String, Object> val = settingOpt.get().getValue();
            if (val != null) {
                enabled = !Boolean.FALSE.equals(val.get("enabled"));
                if (val.get("minimum_orders") != null) {
                    minOrders = ((Number) val.get("minimum_orders")).intValue();
                }
                if (val.get("minimum_spend") != null) {
                    minSpend = ((Number) val.get("minimum_spend")).doubleValue();
                }
                if (val.get("criteria_mode") != null) {
                    criteriaMode = val.get("criteria_mode").toString();
                }
            }
        }

        if (!enabled) return false;

        boolean ordersOk = ordersCount >= minOrders;
        boolean spendOk = totalSpent >= minSpend;
        
        if ("orders_only".equals(criteriaMode)) {
            return ordersOk;
        } else if ("spend_only".equals(criteriaMode)) {
            return spendOk;
        } else if ("both".equals(criteriaMode)) {
            return ordersOk && spendOk;
        } else { 
            return ordersOk || spendOk;
        }
    }

    @Override
    public Map<String, Object> getEligibleCoupons(UUID userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        long ordersCount = 0;
        double totalSpent = 0.0;
        
        for (Order o : orders) {
            String status = o.getOrderStatus() != null ? o.getOrderStatus().toLowerCase() : "";
            String payStatus = o.getPaymentStatus() != null ? o.getPaymentStatus().toLowerCase() : "";
            
            if ("delivered".equals(status) && !List.of("refunded", "refund", "failed").contains(payStatus)) {
                ordersCount++;
                totalSpent += o.getTotalAmount() != null ? o.getTotalAmount().doubleValue() : 0.0;
            }
        }

        Optional<Setting> settingOpt = settingRepository.findById("loyalty_settings");
        boolean enabled = true;
        int minOrders = 3;
        double minSpend = 5000.0;
        String criteriaMode = "either";
        
        if (settingOpt.isPresent()) {
            Map<String, Object> val = settingOpt.get().getValue();
            if (val != null) {
                enabled = !Boolean.FALSE.equals(val.get("enabled"));
                if (val.get("minimum_orders") != null) {
                    minOrders = ((Number) val.get("minimum_orders")).intValue();
                }
                if (val.get("minimum_spend") != null) {
                    minSpend = ((Number) val.get("minimum_spend")).doubleValue();
                }
                if (val.get("criteria_mode") != null) {
                    criteriaMode = val.get("criteria_mode").toString();
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

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("enabled", enabled);
        criteria.put("minimum_orders", minOrders);
        criteria.put("minimum_spend", minSpend);
        criteria.put("criteria_mode", criteriaMode);

        Map<String, Object> stats = new HashMap<>();
        stats.put("orders_count", ordersCount);
        stats.put("total_spent", Math.round(totalSpent * 100.0) / 100.0);
        stats.put("is_loyal", isLoyal);
        stats.put("criteria", criteria);

        if (!isLoyal) {
            return Map.of(
                "is_loyal", false,
                "criteria", criteria,
                "stats", stats,
                "coupons", List.of()
            );
        }

        List<Coupon> allCoupons = couponRepository.findAll();
        List<Map<String, Object>> eligibleCoupons = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();
        
        for (Coupon coupon : allCoupons) {
            if (!Boolean.TRUE.equals(coupon.getIsActive())) continue;
            if (!"loyalty".equalsIgnoreCase(coupon.getCouponType())) continue;
            
            if (coupon.getExpiryDate() != null && now.isAfter(coupon.getExpiryDate())) {
                continue;
            }
            if (coupon.getMaxUsageCount() != null && coupon.getTotalUses() >= coupon.getMaxUsageCount()) {
                continue;
            }
            if (!Boolean.TRUE.equals(coupon.getApplyToAllLoyalCustomers())) {
                List<String> eligibleIds = coupon.getEligibleCustomerIds();
                if (eligibleIds == null || eligibleIds.stream().noneMatch(id -> userId.toString().equalsIgnoreCase(id))) {
                    continue;
                }
            }
            
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", coupon.getId().toString());
            cMap.put("code", coupon.getCode());
            cMap.put("discount_type", coupon.getDiscountType());
            cMap.put("discount_value", coupon.getDiscountValue());
            cMap.put("min_cart_value", coupon.getMinCartValue() != null ? coupon.getMinCartValue() : 0);
            cMap.put("max_discount_limit", coupon.getMaxDiscountLimit());
            cMap.put("expiry_date", coupon.getExpiryDate() != null ? coupon.getExpiryDate().toString() : null);
            cMap.put("coupon_type", coupon.getCouponType() != null ? coupon.getCouponType() : "loyalty");
            eligibleCoupons.add(cMap);
        }

        return Map.of(
            "is_loyal", true,
            "criteria", criteria,
            "stats", stats,
            "coupons", eligibleCoupons
        );
    }
}
