package com.durgashakti.catalog.repository;

import com.durgashakti.common.entity.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {
    List<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, String status);
    Optional<ProductReview> findByProductIdAndUserIdAndOrderId(UUID productId, UUID userId, UUID orderId);
    List<ProductReview> findByProductIdAndUserId(UUID productId, UUID userId);
    long countByProductIdAndStatus(UUID productId, String status);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM ProductReview r WHERE r.productId = ?1 AND r.status = 'published'")
    Double findAverageRatingByProductId(UUID productId);
}
