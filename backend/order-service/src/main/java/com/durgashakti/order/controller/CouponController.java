package com.durgashakti.order.controller;

import com.durgashakti.order.dto.CouponValidateRequest;
import com.durgashakti.order.service.CouponService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @PostMapping("/coupons/validate")
    public ResponseEntity<Map<String, Object>> validateCoupon(
            @RequestBody CouponValidateRequest req,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Map<String, Object> result = couponService.validateCoupon(userId, req.getCode(), req.getCartItems(), req.getCartTotal());
        return ResponseEntity.ok(result);
    }
}
