package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.admin.service.AdminCouponService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminCouponController {

    private final AdminCouponService adminCouponService;

    public AdminCouponController(AdminCouponService adminCouponService) {
        this.adminCouponService = adminCouponService;
    }

    @GetMapping("/coupons")
    public ResponseEntity<List<Coupon>> listAll() {
        return ResponseEntity.ok(adminCouponService.listAll());
    }

    @PostMapping("/coupons")
    public ResponseEntity<Coupon> create(@RequestBody Coupon coupon) {
        return ResponseEntity.ok(adminCouponService.create(coupon));
    }

    @PutMapping("/coupons/{id}")
    public ResponseEntity<Coupon> update(@PathVariable("id") UUID id, @RequestBody Coupon coupon) {
        return ResponseEntity.ok(adminCouponService.update(id, coupon));
    }

    @DeleteMapping("/coupons/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        adminCouponService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
