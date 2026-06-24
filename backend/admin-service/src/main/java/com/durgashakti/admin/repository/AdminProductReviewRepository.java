package com.durgashakti.admin.repository;

import com.durgashakti.common.entity.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminProductReviewRepository extends JpaRepository<ProductReview, UUID> {
}
