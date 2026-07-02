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
    public Map<String, Object> validateCoupon(UUID userId, String code, List<Map<String, Object>> cartItems, double cartTotal) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invalid coupon code"));

        if (!Boolean.TRUE.equals(coupon.getIsActive())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This coupon is inactive");
        }

        if (coupon.getExpiryDate() != null && OffsetDateTime.now().isAfter(coupon.getExpiryDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This coupon has expired");
        }

        if (coupon.getMaxUsageCount() != null && coupon.getTotalUses() >= coupon.getMaxUsageCount()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This coupon's usage limit has been reached");
        }

        if (coupon.getMinCartValue() != null && cartTotal < coupon.getMinCartValue().doubleValue()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Minimum cart value of " + coupon.getMinCartValue() + " required to use this coupon");
        }

        List<String> eligibleCusts = coupon.getEligibleCustomerIds();
        if (eligibleCusts != null && !eligibleCusts.isEmpty()) {
            boolean eligible = eligibleCusts.stream().anyMatch(id -> userId.toString().equalsIgnoreCase(id));
            if (!eligible) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You are not eligible to use this coupon");
            }
        }

        if (coupon.getPerCustomerUsageLimit() != null) {
            long usageCount = couponUsageRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (usageCount >= coupon.getPerCustomerUsageLimit()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You have exceeded the usage limit for this coupon");
            }
        }

        List<String> eligibleProds = coupon.getEligibleProductIds();
        if (eligibleProds != null && !eligibleProds.isEmpty() && !Boolean.TRUE.equals(coupon.getApplyToAllProducts())) {
            boolean anyProductMatch = false;
            for (Map<String, Object> item : cartItems) {
                Object pId = item.get("product_id");
                if (pId != null && eligibleProds.stream().anyMatch(id -> pId.toString().equalsIgnoreCase(id))) {
                    anyProductMatch = true;
                    break;
                }
            }
            if (!anyProductMatch) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "None of the products in your cart are eligible for this coupon");
            }
        }

        double discount = 0;
        if ("percentage".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = cartTotal * (coupon.getDiscountValue().doubleValue() / 100.0);
            if (coupon.getMaxDiscountLimit() != null) {
                discount = Math.min(discount, coupon.getMaxDiscountLimit().doubleValue());
            }
        } else if ("flat".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = Math.min(coupon.getDiscountValue().doubleValue(), cartTotal);
        } else if ("free_shipping".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = 0;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("valid", true);
        response.put("code", coupon.getCode());
        response.put("discount_type", coupon.getDiscountType());
        response.put("discount_value", coupon.getDiscountValue());
        response.put("calculated_discount", Math.round(discount * 100.0) / 100.0);
        return response;
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
            } else { // "either"
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
