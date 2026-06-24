package com.durgashakti.catalog.controller;

import com.durgashakti.common.entity.Category;
import com.durgashakti.catalog.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "search", required = false) String search) {
        Map<String, Object> response = catalogService.getProducts(page, limit, search);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable("id") UUID id) {
        Map<String, Object> product = catalogService.getProduct(id);
        return ResponseEntity.ok(product);
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getPublicCategories() {
        List<Category> categories = catalogService.getPublicCategories();
        return ResponseEntity.ok(categories);
    }
}
