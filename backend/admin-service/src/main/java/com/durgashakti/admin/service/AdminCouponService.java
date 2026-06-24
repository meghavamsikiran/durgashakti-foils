package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Coupon;
import java.util.List;
import java.util.UUID;

public interface AdminCouponService {
    List<Coupon> listAll();
    Coupon create(Coupon coupon);
    Coupon update(UUID id, Coupon updatedCoupon);
    void delete(UUID id);
}
