package com.durgashakti.order.repository;

import com.durgashakti.common.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderServiceRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Order> findByIdAndUserId(UUID id, UUID userId);
    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdWithLock(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.razorpayOrderId = :razorpayOrderId")
    Optional<Order> findByRazorpayOrderIdWithLock(@Param("razorpayOrderId") String razorpayOrderId);

    @Query("SELECT o FROM Order o WHERE o.paymentMethod = 'online' AND o.paymentStatus = 'pending' AND o.orderStatus IN ('pending_payment', 'confirmed') AND o.createdAt < :cutoff")
    List<Order> findExpiredPaymentOrders(@Param("cutoff") OffsetDateTime cutoff);
}
