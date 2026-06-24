package com.durgashakti.admin.repository;

import com.durgashakti.common.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminCouponRepository extends JpaRepository<Coupon, UUID> {
}
