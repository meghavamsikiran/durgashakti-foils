package com.durgashakti.catalog.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ReviewService {
    Map<String, Object> getProductReviews(UUID productId, int page, int limit);
    Map<String, Object> checkReviewEligibility(UUID productId, UUID orderId, UUID userId);
    Map<String, Object> submitProductReview(UUID userId, UUID productId, UUID orderId, int rating,
                                           String title, String comment, String publicName,
                                           String existingMediaJson, List<MultipartFile> files);
    Map<String, Object> deleteProductReview(UUID reviewId, UUID userId, String role);
    Map<String, Object> getGoogleReviewsSummary();
}
