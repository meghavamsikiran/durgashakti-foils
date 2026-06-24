package com.durgashakti.admin.service;

import com.durgashakti.common.entity.ProductReview;
import java.util.Map;
import java.util.UUID;

public interface AdminReviewService {
    Map<String, Object> listReviews(int page, int limit, String search, String status, Integer rating);
    ProductReview updateStatus(UUID reviewId, String status);
    ProductReview updateReply(UUID reviewId, String reply);
    void deleteReview(UUID reviewId);
}
