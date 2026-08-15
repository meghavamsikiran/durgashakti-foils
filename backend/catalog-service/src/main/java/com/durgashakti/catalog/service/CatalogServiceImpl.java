package com.durgashakti.catalog.service;

import com.durgashakti.common.entity.Category;
import com.durgashakti.common.entity.Product;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.catalog.repository.CatalogCategoryRepository;
import com.durgashakti.catalog.repository.CatalogProductRepository;
import com.durgashakti.catalog.repository.CatalogProductReviewRepository;
import com.durgashakti.catalog.repository.CatalogSettingRepository;
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
public class CatalogServiceImpl implements CatalogService {

    private final CatalogProductRepository productRepository;
    private final CatalogCategoryRepository categoryRepository;
    private final CatalogProductReviewRepository reviewRepository;
    private final CatalogSettingRepository settingRepository;

    public CatalogServiceImpl(CatalogProductRepository productRepository,
                              CatalogCategoryRepository categoryRepository,
                              CatalogProductReviewRepository reviewRepository,
                              CatalogSettingRepository settingRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.reviewRepository = reviewRepository;
        this.settingRepository = settingRepository;
    }

    @Override
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

    @Override
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

    @Override
    public List<Category> getPublicCategories() {
        return categoryRepository.findByIsActiveTrueOrderByNameAsc();
    }

    private Map<String, Object> convertProductToMap(Product p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId().toString());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("price", p.getPrice());
        map.put("base_price", p.getPrice());
        map.put("discount_price", p.getDiscountPrice());
        map.put("compare_at_price", p.getDiscountPrice());
        map.put("image_url", p.getImageUrl());
        map.put("images", p.getMediaUrls());
        map.put("is_active", p.getIsActive());
        map.put("stock_quantity", p.getStockQuantity());
        map.put("variant_sku", p.getVariantSku());
        map.put("batch_no", p.getBatchNo());
        map.put("category", p.getCategory());
        map.put("category_id", p.getCategory());
        map.put("size", p.getSize());
        map.put("thickness", p.getThickness());
        map.put("badge", p.getBadge());
        map.put("width", p.getWidth());
        map.put("metadata", p.getFeatures());
        map.put("created_at", p.getCreatedAt());
        map.put("updated_at", p.getUpdatedAt());
        return map;
    }

    private void attachReviewSummary(Map<String, Object> productMap, UUID productId) {
        long count = reviewRepository.countByProductIdAndStatus(productId, "published");
        Double avg = reviewRepository.findAverageRatingByProductId(productId);
        productMap.put("review_count", count);
        productMap.put("rating_average", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
    }

    @Override
    public Map<String, Object> getPublicSettings() {
        Map<String, Object> response = new HashMap<>();
        
        Optional<Setting> companyProfile = settingRepository.findById("company_profile");
        Optional<Setting> paymentSettings = settingRepository.findById("payment_settings");
        Optional<Setting> shippingSettings = settingRepository.findById("shipping_settings");
        Optional<Setting> popupBanner = settingRepository.findById("popup_banner");
        Optional<Setting> scrollingBanner = settingRepository.findById("scrolling_banner");
        Optional<Setting> loyaltySettings = settingRepository.findById("loyalty_settings");
        
        if (companyProfile.isPresent()) {
            response.put("company_profile", companyProfile.get().getValue());
        } else {
            response.put("company_profile", Map.of());
        }
        
        if (paymentSettings.isPresent()) {
            response.put("payment_settings", paymentSettings.get().getValue());
        } else {
            response.put("payment_settings", Map.of("cod_enabled", true));
        }

        if (shippingSettings.isPresent()) {
            response.put("shipping_settings", shippingSettings.get().getValue());
        } else {
            response.put("shipping_settings", Map.of());
        }

        if (popupBanner.isPresent() && popupBanner.get().getValue() != null) {
            response.put("popup_banner", popupBanner.get().getValue());
        } else {
            response.put("popup_banner", Map.of("promoted_coupons", List.of(), "custom_banners", List.of()));
        }

        if (scrollingBanner.isPresent() && scrollingBanner.get().getValue() != null) {
            response.put("scrolling_banner", scrollingBanner.get().getValue());
        } else {
            response.put("scrolling_banner", Map.of());
        }

        if (loyaltySettings.isPresent() && loyaltySettings.get().getValue() != null) {
            response.put("loyalty_settings", loyaltySettings.get().getValue());
        } else {
            response.put("loyalty_settings", Map.of("enabled", true, "minimum_orders", 10, "minimum_spend", 15000, "criteria_mode", "either"));
        }

        Optional<Setting> walletSettings = settingRepository.findById("wallet_settings");
        if (walletSettings.isPresent() && walletSettings.get().getValue() != null) {
            response.put("wallet_settings", walletSettings.get().getValue());
        } else {
            response.put("wallet_settings", Map.of("enabled", true, "disabled_reason", "DSF Wallet system is currently disabled by store management."));
        }
        
        return response;
    }
}
