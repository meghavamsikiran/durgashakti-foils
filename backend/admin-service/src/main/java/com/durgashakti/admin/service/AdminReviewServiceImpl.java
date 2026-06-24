package com.durgashakti.admin.service;

import com.durgashakti.admin.repository.AdminProductRepository;
import com.durgashakti.admin.repository.AdminProductReviewRepository;
import com.durgashakti.admin.repository.AdminUserRepository;
import com.durgashakti.common.entity.Product;
import com.durgashakti.common.entity.ProductReview;
import com.durgashakti.common.entity.User;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminReviewServiceImpl implements AdminReviewService {

    private final AdminProductReviewRepository reviewRepository;
    private final AdminProductRepository productRepository;
    private final AdminUserRepository userRepository;

    public AdminReviewServiceImpl(AdminProductReviewRepository reviewRepository,
                                  AdminProductRepository productRepository,
                                  AdminUserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> listReviews(int page, int limit, String search, String status, Integer rating) {
        List<ProductReview> allReviews = reviewRepository.findAll();

        allReviews.sort((r1, r2) -> {
            if (r1.getCreatedAt() == null) return 1;
            if (r2.getCreatedAt() == null) return -1;
            return r2.getCreatedAt().compareTo(r1.getCreatedAt());
        });

        List<ProductReview> filtered = allReviews.stream()
                .filter(r -> {
                    if (status != null && !status.equalsIgnoreCase("all") && !status.equalsIgnoreCase(r.getStatus())) {
                        return false;
                    }
                    if (rating != null && r.getRating() != rating) {
                        return false;
                    }
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchTitle = r.getTitle() != null && r.getTitle().toLowerCase().contains(term);
                        boolean matchComment = r.getComment() != null && r.getComment().toLowerCase().contains(term);
                        boolean matchName = r.getPublicName() != null && r.getPublicName().toLowerCase().contains(term);
                        
                        Product p = productRepository.findById(r.getProductId()).orElse(null);
                        boolean matchProduct = p != null && p.getName() != null && p.getName().toLowerCase().contains(term);
                        
                        User u = userRepository.findById(r.getUserId()).orElse(null);
                        boolean matchUser = u != null && ((u.getEmail() != null && u.getEmail().toLowerCase().contains(term)) ||
                                (u.getFullName() != null && u.getFullName().toLowerCase().contains(term)));

                        return matchTitle || matchComment || matchName || matchProduct || matchUser;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = Math.min((page - 1) * limit, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<ProductReview> paginated = filtered.subList(fromIndex, toIndex);

        List<Map<String, Object>> items = paginated.stream()
                .map(r -> {
                    Product p = productRepository.findById(r.getProductId()).orElse(null);
                    User u = userRepository.findById(r.getUserId()).orElse(null);

                    Map<String, Object> map = new HashMap<>();
                    map.put("id", r.getId().toString());
                    map.put("product_id", r.getProductId().toString());
                    map.put("user_id", r.getUserId().toString());
                    map.put("order_id", r.getOrderId().toString());
                    map.put("rating", r.getRating());
                    map.put("title", r.getTitle());
                    map.put("comment", r.getComment());
                    map.put("public_name", r.getPublicName());
                    map.put("media_urls", r.getMediaUrls());
                    map.put("status", r.getStatus());
                    map.put("admin_reply", r.getAdminReply());
                    map.put("is_verified_purchase", true);
                    if (r.getAdminReply() != null && !r.getAdminReply().isEmpty()) {
                        map.put("admin_reply_author", "Durga Shakti Foils");
                        map.put("admin_reply_verified", true);
                    }
                    map.put("created_at", r.getCreatedAt());
                    map.put("updated_at", r.getUpdatedAt());

                    map.put("product_name", p != null ? p.getName() : "Deleted product");
                    map.put("product_image", p != null ? p.getImageUrl() : null);
                    map.put("customer_name", u != null ? u.getFullName() : r.getPublicName());
                    map.put("customer_email", u != null ? u.getEmail() : null);

                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total);
        result.put("page", page);
        result.put("limit", limit);
        return result;
    }

    @Override
    public ProductReview updateStatus(UUID reviewId, String status) {
        ProductReview r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        
        String normStatus = status.trim().toLowerCase();
        if (!normStatus.equals("published") && !normStatus.equals("hidden")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Review status must be published or hidden");
        }
        
        r.setStatus(normStatus);
        r.setUpdatedAt(OffsetDateTime.now());
        return reviewRepository.save(r);
    }

    @Override
    public ProductReview updateReply(UUID reviewId, String reply) {
        ProductReview r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));

        String cleanReply = reply != null ? reply.trim() : "";
        if (cleanReply.isEmpty()) {
            r.setAdminReply(null);
            r.setAdminReplyBy(null);
            r.setAdminReplyAt(null);
        } else {
            r.setAdminReply(cleanReply.length() > 2000 ? cleanReply.substring(0, 2000) : cleanReply);
            r.setAdminReplyAt(OffsetDateTime.now());
        }
        r.setUpdatedAt(OffsetDateTime.now());
        return reviewRepository.save(r);
    }

    @Override
    public void deleteReview(UUID reviewId) {
        ProductReview r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        reviewRepository.delete(r);
    }
}
