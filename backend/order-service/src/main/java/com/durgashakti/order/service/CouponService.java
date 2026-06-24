package com.durgashakti.order.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CouponService {
    Map<String, Object> validateCoupon(UUID userId, String code, List<Map<String, Object>> cartItems, double cartTotal);
}
