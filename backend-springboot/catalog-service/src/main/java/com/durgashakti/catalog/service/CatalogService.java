package com.durgashakti.catalog.service;

import com.durgashakti.common.entity.Category;
import com.durgashakti.common.entity.Product;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.catalog.repository.CategoryRepository;
import com.durgashakti.catalog.repository.CatalogProductRepository;
import com.durgashakti.catalog.repository.ProductReviewRepository;
import com.durgashakti.catalog.repository.SettingRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class CatalogService {

    private final CatalogProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductReviewRepository reviewRepository;
    private final SettingRepository settingRepository;

    public CatalogService(CatalogProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          ProductReviewRepository reviewRepository,
                          SettingRepository settingRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.reviewRepository = reviewRepository;
        this.settingRepository = settingRepository;
    }

    public Map<String, Object> getProducts(int page, int limit, String search) {
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by("name").ascending().and(Sort.by("id").ascending()));
        Page<Product> productPage;
        if (search != null && !search.trim().isEmpty()) {
            String likePattern = "%" + search.trim() + "%";
            productPage = productRepository.findByIsActiveTrueAndSearchQuery(likePattern, pageable);
        } else {
            productPage = productRepository.findByIsActiveTrue(pageable);
        }

        List<Product> products = productPage.getContent();
        // Since we aren't doing dynamic pricing logic fully in common-lib yet, let's keep it simple or serialize directly
        // Python code calls apply_effective_product_pricing, attach_applicable_product_coupons, and _attach_review_summaries.
        // Let's populate the review summary info for each product.
        List<Map<String, Object>> items = new ArrayList<>();
        for (Product p : products) {
            Map<String, Object> pMap = convertProductToMap(p);
            attachReviewSummary(pMap, p.getId());
            items.add(pMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("total", productPage.getTotalElements());
        response.put("page", page);
        response.put("limit", limit);
        return response;
    }

    public Map<String, Object> getProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!Boolean.TRUE.equals(product.getIsActive())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        }
        Map<String, Object> pMap = convertProductToMap(product);
        attachReviewSummary(pMap, product.getId());
        return pMap;
    }

    public List<Category> getPublicCategories() {
        return categoryRepository.findByIsActiveTrueOrderByNameAsc();
    }

    private Map<String, Object> convertProductToMap(Product p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId().toString());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("price", p.getPrice());
        map.put("compare_at_price", p.getDiscountPrice());
        map.put("image_url", p.getImageUrl());
        map.put("images", p.getMediaUrls());
        map.put("is_active", p.getIsActive());
        map.put("stock_quantity", p.getStockQuantity());
        map.put("variant_sku", p.getVariantSku());
        map.put("batch_no", p.getBatchNo());
        map.put("category_id", p.getCategory());
        map.put("metadata", p.getFeatures());
        map.put("created_at", p.getCreatedAt());
        map.put("updated_at", p.getUpdatedAt());
        return map;
    }

    private void attachReviewSummary(Map<String, Object> productMap, UUID productId) {
        // Fetch review count and average rating
        long count = reviewRepository.countByProductIdAndStatus(productId, "published");
        Double avg = reviewRepository.findAverageRatingByProductId(productId);
        productMap.put("review_count", count);
        productMap.put("rating_average", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
    }
}
