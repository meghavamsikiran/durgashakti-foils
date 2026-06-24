package com.durgashakti.order.repository;

import com.durgashakti.common.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
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

    @Query("SELECT o FROM Order o WHERE o.paymentMethod = 'online' AND o.paymentStatus = 'pending' AND o.orderStatus IN ('pending_payment', 'confirmed') AND o.createdAt < :cutoff")
    List<Order> findExpiredPaymentOrders(@Param("cutoff") OffsetDateTime cutoff);
}
