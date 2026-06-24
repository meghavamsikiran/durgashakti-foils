package com.durgashakti.catalog.controller;

import com.durgashakti.catalog.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/reviews/google-summary")
    public ResponseEntity<Map<String, Object>> getGoogleReviewsSummary() {
        return ResponseEntity.ok(reviewService.getGoogleReviewsSummary());
    }

    @GetMapping("/products/{productId}/reviews")
    public ResponseEntity<Map<String, Object>> getProductReviews(
            @PathVariable("productId") UUID productId,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId, page, limit));
    }

    @GetMapping("/reviews/eligibility")
    public ResponseEntity<Map<String, Object>> checkReviewEligibility(
            @RequestParam("product_id") UUID productId,
            @RequestParam("order_id") UUID orderId,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(reviewService.checkReviewEligibility(productId, orderId, userId));
    }

    @PostMapping(value = "/reviews")
    public ResponseEntity<Map<String, Object>> submitProductReview(
            @RequestParam("product_id") UUID productId,
            @RequestParam("order_id") UUID orderId,
            @RequestParam("rating") int rating,
            @RequestParam("title") String title,
            @RequestParam(value = "comment", defaultValue = "") String comment,
            @RequestParam("public_name") String publicName,
            @RequestParam(value = "existing_media", required = false) String existingMediaJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Map<String, Object> response = reviewService.submitProductReview(
                userId, productId, orderId, rating, title, comment, publicName, existingMediaJson, files
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Map<String, Object>> deleteProductReview(
            @PathVariable("reviewId") UUID reviewId,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        String role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(r -> r.replace("ROLE_", ""))
                .findFirst()
                .orElse("customer");
        return ResponseEntity.ok(reviewService.deleteProductReview(reviewId, userId, role));
    }
}
