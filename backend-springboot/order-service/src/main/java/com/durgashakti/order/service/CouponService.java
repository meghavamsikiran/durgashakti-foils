package com.durgashakti.order.service;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.repository.OrderCouponRepository;
import com.durgashakti.order.repository.CouponUsageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class CouponService {

    private final OrderCouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;

    public CouponService(OrderCouponRepository couponRepository, CouponUsageRepository couponUsageRepository) {
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
    }

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

        // Check customer eligibility
        List<String> eligibleCusts = coupon.getEligibleCustomerIds();
        if (eligibleCusts != null && !eligibleCusts.isEmpty()) {
            boolean eligible = eligibleCusts.stream().anyMatch(id -> userId.toString().equalsIgnoreCase(id));
            if (!eligible) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You are not eligible to use this coupon");
            }
        }

        // Check per customer limit
        if (coupon.getPerCustomerUsageLimit() != null) {
            long usageCount = couponUsageRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (usageCount >= coupon.getPerCustomerUsageLimit()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You have exceeded the usage limit for this coupon");
            }
        }

        // Check product eligibility
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

        // Calculate discount
        double discount = 0;
        if ("percentage".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = cartTotal * (coupon.getDiscountValue().doubleValue() / 100.0);
            if (coupon.getMaxDiscountLimit() != null) {
                discount = Math.min(discount, coupon.getMaxDiscountLimit().doubleValue());
            }
        } else if ("flat".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = Math.min(coupon.getDiscountValue().doubleValue(), cartTotal);
        } else if ("free_shipping".equalsIgnoreCase(coupon.getDiscountType())) {
            // Free shipping coupon, discount is handled by shipping calculations
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
}
