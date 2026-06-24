package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.admin.repository.CouponRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminCouponService {

    private final CouponRepository couponRepository;

    public AdminCouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Transactional(readOnly = true)
    public List<Coupon> listAll() {
        return couponRepository.findAll();
    }

    public Coupon create(Coupon coupon) {
        coupon.setCreatedAt(OffsetDateTime.now());
        coupon.setUpdatedAt(OffsetDateTime.now());
        coupon.setTotalUses(0);
        return couponRepository.save(coupon);
    }

    public Coupon update(UUID id, Coupon updatedCoupon) {
        Coupon cop = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found"));

        cop.setCode(updatedCoupon.getCode());
        cop.setDiscountType(updatedCoupon.getDiscountType());
        cop.setDiscountValue(updatedCoupon.getDiscountValue());
        cop.setMinCartValue(updatedCoupon.getMinCartValue());
        cop.setMaxDiscountLimit(updatedCoupon.getMaxDiscountLimit());
        cop.setMaxUsageCount(updatedCoupon.getMaxUsageCount());
        cop.setPerCustomerUsageLimit(updatedCoupon.getPerCustomerUsageLimit());
        cop.setIsActive(updatedCoupon.getIsActive());
        cop.setCouponType(updatedCoupon.getCouponType());
        cop.setApplyToAllLoyalCustomers(updatedCoupon.getApplyToAllLoyalCustomers());
        cop.setApplyToAllProducts(updatedCoupon.getApplyToAllProducts());
        cop.setEligibleCustomerIds(updatedCoupon.getEligibleCustomerIds());
        cop.setEligibleProductIds(updatedCoupon.getEligibleProductIds());
        cop.setExpiryDate(updatedCoupon.getExpiryDate());
        cop.setUpdatedAt(OffsetDateTime.now());

        return couponRepository.save(cop);
    }

    public void delete(UUID id) {
        Coupon cop = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found"));
        couponRepository.delete(cop);
    }
}
