package com.durgashakti.catalog.repository;

import com.durgashakti.common.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CatalogOrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByIdAndUserId(UUID id, UUID userId);
}
