package com.durgashakti.order.repository;

import com.durgashakti.common.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, UUID> {
    Optional<Coupon> findByCode(String code);
    Optional<Coupon> findByCodeIgnoreCase(String code);
}
