package com.durgashakti.order.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CouponService {
    Map<String, Object> validateCoupons(UUID userId, List<String> codes, double subtotal);
    Map<String, Object> getEligibleCoupons(UUID userId);
}
