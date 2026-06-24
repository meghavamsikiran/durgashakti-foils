package com.durgashakti.catalog.service;

import com.durgashakti.common.entity.Category;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CatalogService {
    Map<String, Object> getProducts(int page, int limit, String search);
    Map<String, Object> getProduct(UUID productId);
    List<Category> getPublicCategories();
}
