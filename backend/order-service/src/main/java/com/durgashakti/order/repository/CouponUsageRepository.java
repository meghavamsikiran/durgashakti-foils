package com.durgashakti.order.repository;

import com.durgashakti.common.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, UUID> {
    long countByCouponIdAndUserId(UUID couponId, UUID userId);
}
