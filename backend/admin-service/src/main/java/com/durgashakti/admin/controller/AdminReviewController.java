package com.durgashakti.admin.controller;

import com.durgashakti.admin.service.AdminReviewService;
import com.durgashakti.common.entity.ProductReview;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminReviewController {

    private final AdminReviewService adminReviewService;

    public AdminReviewController(AdminReviewService adminReviewService) {
        this.adminReviewService = adminReviewService;
    }

    @GetMapping("/reviews")
    public ResponseEntity<Map<String, Object>> listReviews(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "rating", required = false) Integer rating) {
        return ResponseEntity.ok(adminReviewService.listReviews(page, limit, search, status, rating));
    }

    @PutMapping("/reviews/{reviewId}/status")
    public ResponseEntity<ProductReview> updateStatus(
            @PathVariable("reviewId") UUID reviewId,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(adminReviewService.updateStatus(reviewId, status));
    }

    @PutMapping("/reviews/{reviewId}/reply")
    public ResponseEntity<ProductReview> updateReply(
            @PathVariable("reviewId") UUID reviewId,
            @RequestBody Map<String, String> payload) {
        String reply = payload.get("reply");
        return ResponseEntity.ok(adminReviewService.updateReply(reviewId, reply));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable("reviewId") UUID reviewId) {
        adminReviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }
}
