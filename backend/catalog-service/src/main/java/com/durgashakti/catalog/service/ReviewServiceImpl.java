package com.durgashakti.catalog.service;

import com.durgashakti.catalog.repository.CatalogProductRepository;
import com.durgashakti.catalog.repository.CatalogProductReviewRepository;
import com.durgashakti.catalog.repository.CatalogSettingRepository;
import com.durgashakti.catalog.repository.CatalogOrderRepository;
import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class ReviewServiceImpl implements ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewServiceImpl.class);

    private final CatalogProductReviewRepository reviewRepository;
    private final CatalogProductRepository productRepository;
    private final CatalogSettingRepository settingRepository;
    private final CatalogOrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    @Value("${google.review-count:57}")
    private int fallbackReviewCount;

    @Value("${google.rating:5.0}")
    private double fallbackRating;

    public ReviewServiceImpl(CatalogProductReviewRepository reviewRepository,
                             CatalogProductRepository productRepository,
                             CatalogSettingRepository settingRepository,
                             CatalogOrderRepository orderRepository,
                             ObjectMapper objectMapper) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.settingRepository = settingRepository;
        this.orderRepository = orderRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getProductReviews(UUID productId, int page, int limit) {
        Map<String, Object> settings = getFeedbackSettings();
        if (Boolean.FALSE.equals(settings.get("ratings_enabled"))) {
            return Map.of(
                    "review_count", 0,
                    "rating_average", 0.0,
                    "rating_distribution", Map.of("1", 0, "2", 0, "3", 0, "4", 0, "5", 0),
                    "items", List.of(),
                    "page", page,
                    "limit", limit,
                    "settings", settings
            );
        }

        List<ProductReview> reviews = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(productId, "published");
        int total = reviews.size();
        int fromIndex = Math.min((page - 1) * limit, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<ProductReview> paginatedReviews = reviews.subList(fromIndex, toIndex);

        List<Map<String, Object>> items = new ArrayList<>();
        boolean commentsEnabled = !Boolean.FALSE.equals(settings.get("comments_enabled"));
        for (ProductReview r : paginatedReviews) {
            Map<String, Object> rMap = serializeReview(r);
            if (!commentsEnabled) {
                rMap.put("comment", "");
            }
            items.add(rMap);
        }

        Map<String, Integer> distribution = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(String.valueOf(i), 0);
        }
        double sum = 0;
        int count = 0;
        for (ProductReview r : reviews) {
            int rating = r.getRating();
            if (rating >= 1 && rating <= 5) {
                distribution.put(String.valueOf(rating), distribution.get(String.valueOf(rating)) + 1);
                sum += rating;
                count++;
            }
        }
        double avg = count > 0 ? Math.round((sum / count) * 10.0) / 10.0 : 0.0;

        Map<String, Object> response = new HashMap<>();
        response.put("review_count", count);
        response.put("rating_average", avg);
        response.put("rating_distribution", distribution);
        response.put("items", items);
        response.put("page", page);
        response.put("limit", limit);
        response.put("settings", settings);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkReviewEligibility(UUID productId, UUID orderId, UUID userId) {
        Map<String, Object> settings = getFeedbackSettings();
        if (Boolean.FALSE.equals(settings.get("ratings_enabled"))) {
            return Map.of("can_review", false, "reason", "Ratings are currently disabled", "existing_review", Optional.empty());
        }

        Optional<ProductReview> existingReview = reviewRepository.findByProductIdAndUserIdAndOrderId(productId, userId, orderId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        try {
            validatePurchaseForReview(userId, productId, orderId);
            return Map.of(
                    "can_review", true,
                    "reason", Optional.empty(),
                    "existing_review", existingReview.map(this::serializeReview).orElse(null),
                    "settings", settings,
                    "product", Map.of(
                            "id", product.getId().toString(),
                            "name", product.getName(),
                            "image_url", product.getImageUrl()
                    )
            );
        } catch (ApiException e) {
            return Map.of(
                    "can_review", false,
                    "reason", e.getMessage(),
                    "existing_review", Optional.empty()
            );
        }
    }

    @Override
    public Map<String, Object> submitProductReview(UUID userId, UUID productId, UUID orderId, int rating,
                                                   String title, String comment, String publicName,
                                                   String existingMediaJson, List<MultipartFile> files) {
        Map<String, Object> settings = getFeedbackSettings();
        if (Boolean.FALSE.equals(settings.get("ratings_enabled"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ratings are currently disabled");
        }
        if (rating < 1 || rating > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }
        String cleanTitle = title.trim();
        String cleanComment = comment != null && !Boolean.FALSE.equals(settings.get("comments_enabled")) ? comment.trim() : "";
        String cleanPublicName = publicName.trim();
        if (cleanTitle.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Review title is required");
        }
        if (cleanPublicName.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Public name is required");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        validatePurchaseForReview(userId, productId, orderId);

        List<String> retainedMedia = new ArrayList<>();
        if (existingMediaJson != null && !existingMediaJson.trim().isEmpty()) {
            try {
                List<Object> parsed = objectMapper.readValue(existingMediaJson, new TypeReference<>() {});
                for (Object item : parsed) {
                    if (item instanceof Map) {
                        Map<String, Object> mItem = (Map<String, Object>) item;
                        if (mItem.containsKey("url")) {
                            retainedMedia.add(String.valueOf(mItem.get("url")));
                        }
                    } else if (item instanceof String) {
                        retainedMedia.add((String) item);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse existing media json: {}", e.getMessage());
            }
        }

        List<String> uploadedMedia = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String contentType = file.getContentType();
                boolean isImage = contentType != null && contentType.startsWith("image/");
                boolean isVideo = contentType != null && contentType.startsWith("video/");
                if (!isImage && !isVideo) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Only image and video uploads are allowed");
                }
                if (isImage && file.getSize() > 2 * 1024 * 1024) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Image size must be less than 2MB");
                }
                if (isVideo && file.getSize() > 10 * 1024 * 1024) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Video size must be less than 10MB");
                }
                String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
                String mockUrl = "/uploads/" + filename;
                uploadedMedia.add(mockUrl);
            }
        }

        List<String> finalMedia = new ArrayList<>(retainedMedia);
        finalMedia.addAll(uploadedMedia);

        Optional<ProductReview> existing = reviewRepository.findByProductIdAndUserIdAndOrderId(productId, userId, orderId);
        ProductReview review;
        OffsetDateTime now = OffsetDateTime.now();
        if (existing.isPresent()) {
            review = existing.get();
            review.setRating(rating);
            review.setTitle(cleanTitle);
            review.setComment(cleanComment);
            review.setPublicName(cleanPublicName);
            review.setMediaUrls(finalMedia);
            review.setStatus("published");
            review.setUpdatedAt(now);
        } else {
            review = new ProductReview();
            review.setProductId(productId);
            review.setUserId(userId);
            review.setOrderId(orderId);
            review.setRating(rating);
            review.setTitle(cleanTitle);
            review.setComment(cleanComment);
            review.setPublicName(cleanPublicName);
            review.setMediaUrls(finalMedia);
            review.setStatus("published");
            review.setCreatedAt(now);
            review.setUpdatedAt(now);
        }

        reviewRepository.save(review);
        return Map.of("message", "Review submitted", "review", serializeReview(review));
    }

    @Override
    public Map<String, Object> deleteProductReview(UUID reviewId, UUID userId, String role) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));

        boolean isOwner = review.getUserId().equals(userId);
        boolean isAdmin = "admin".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role);
        if (!isOwner && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission to delete this review");
        }

        reviewRepository.delete(review);
        return Map.of("message", "Review deleted successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getGoogleReviewsSummary() {
        double rating = fallbackRating;
        int count = fallbackReviewCount;
        Map<String, Integer> dist = new HashMap<>();
        dist.put("5", count - 1);
        dist.put("4", 1);
        dist.put("3", 0);
        dist.put("2", 0);
        dist.put("1", 0);

        return Map.of(
                "rating_average", rating,
                "review_count", count,
                "rating_distribution", dist
        );
    }

    private Map<String, Object> getFeedbackSettings() {
        Optional<Setting> settingOpt = settingRepository.findById("feedback_settings");
        Map<String, Object> settings = new HashMap<>();
        settings.put("ratings_enabled", true);
        settings.put("comments_enabled", true);

        if (settingOpt.isPresent()) {
            Object val = settingOpt.get().getValue();
            if (val instanceof Map) {
                Map<String, Object> mVal = (Map<String, Object>) val;
                settings.put("ratings_enabled", mVal.getOrDefault("ratings_enabled", true));
                settings.put("comments_enabled", mVal.getOrDefault("comments_enabled", true));
            }
        }
        return settings;
    }

    private void validatePurchaseForReview(UUID userId, UUID productId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        boolean containsProduct = false;
        List<Map<String, Object>> items = order.getItems();
        if (items != null) {
            for (Map<String, Object> item : items) {
                if (productId.toString().equals(String.valueOf(item.get("product_id")))) {
                    containsProduct = true;
                    break;
                }
            }
        }
        if (!containsProduct) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This product was not part of the selected order");
        }

        String orderStatus = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
        List<String> validStatuses = List.of("delivered", "return_requested", "return_approved", "return_rejected", "refunded");
        if (!validStatuses.contains(orderStatus)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Reviews are available after a valid purchase");
        }
    }

    private Map<String, Object> serializeReview(ProductReview review) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", review.getId().toString());
        map.put("product_id", review.getProductId().toString());
        map.put("user_id", review.getUserId().toString());
        map.put("order_id", review.getOrderId().toString());
        map.put("rating", review.getRating());
        map.put("title", review.getTitle());
        map.put("comment", review.getComment());
        map.put("public_name", review.getPublicName());
        map.put("media_urls", review.getMediaUrls());
        map.put("status", review.getStatus());
        map.put("admin_reply", review.getAdminReply());
        map.put("is_verified_purchase", true);
        if (review.getAdminReply() != null && !review.getAdminReply().isEmpty()) {
            map.put("admin_reply_author", "Durga Shakti Foils");
            map.put("admin_reply_verified", true);
        }
        map.put("created_at", review.getCreatedAt());
        map.put("updated_at", review.getUpdatedAt());
        return map;
    }
}
