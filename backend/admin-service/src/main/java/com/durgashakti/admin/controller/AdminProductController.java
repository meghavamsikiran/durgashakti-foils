package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Product;
import com.durgashakti.admin.service.AdminProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminProductController {

    private final AdminProductService adminProductService;
    private final com.durgashakti.admin.service.AuditLogService auditLogService;

    public AdminProductController(AdminProductService adminProductService,
                                 com.durgashakti.admin.service.AuditLogService auditLogService) {
        this.adminProductService = adminProductService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/products")
    @PreAuthorize("hasAuthority('view_products')")
    public ResponseEntity<Map<String, Object>> listAll(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "is_active", required = false) Boolean isActive,
            @RequestParam(value = "stock", required = false) String stock) {
        
        List<Product> allProducts = adminProductService.listAll();
        
        List<Product> filtered = allProducts.stream()
                .filter(p -> {
                    if (search != null && !search.trim().isEmpty()) {
                        String term = search.toLowerCase().trim();
                        boolean matchName = p.getName() != null && p.getName().toLowerCase().contains(term);
                        boolean matchSku = p.getVariantSku() != null && p.getVariantSku().toLowerCase().contains(term);
                        boolean matchBatch = p.getBatchNo() != null && p.getBatchNo().toLowerCase().contains(term);
                        boolean matchCat = p.getCategory() != null && p.getCategory().toLowerCase().contains(term);
                        if (!matchName && !matchSku && !matchBatch && !matchCat) return false;
                    }
                    if (category != null && !category.trim().isEmpty()) {
                        if (p.getCategory() == null || !p.getCategory().equalsIgnoreCase(category)) return false;
                    }
                    if (isActive != null) {
                        if (p.getIsActive() == null || !p.getIsActive().equals(isActive)) return false;
                    }
                    if (stock != null && !stock.trim().isEmpty()) {
                        String s = stock.toLowerCase();
                        int qty = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
                        if ("in".equals(s)) {
                            if (qty <= 0) return false;
                        } else if ("out".equals(s)) {
                            if (qty > 0) return false;
                        } else if ("low".equals(s)) {
                            int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 20;
                            if (qty <= 0 || qty > threshold) return false;
                        }
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<Product> paginated;
        if (fromIndex >= total) {
            paginated = Collections.emptyList();
        } else {
            paginated = filtered.subList(fromIndex, Math.min(fromIndex + limit, total));
        }

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("items", paginated);
        response.put("total", total);
        response.put("page", page);
        response.put("limit", limit);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/products")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product created = adminProductService.createProduct(product);
        auditLogService.logAction("PRODUCT_CREATED", "product", created.getId() != null ? created.getId().toString() : "N/A",
                Map.of("name", created.getName() != null ? created.getName() : "N/A",
                       "price", created.getPrice() != null ? created.getPrice() : 0,
                       "category", created.getCategory() != null ? created.getCategory() : "N/A",
                       "stock_quantity", created.getStockQuantity() != null ? created.getStockQuantity() : 0));
        return ResponseEntity.ok(created);
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Product> updateProduct(@PathVariable("id") UUID id, @RequestBody Product product) {
        Product updated = adminProductService.updateProduct(id, product);
        auditLogService.logAction("PRODUCT_UPDATED", "product", id.toString(),
                Map.of("name", updated.getName() != null ? updated.getName() : "N/A",
                       "price", updated.getPrice() != null ? updated.getPrice() : 0,
                       "category", updated.getCategory() != null ? updated.getCategory() : "N/A",
                       "stock_quantity", updated.getStockQuantity() != null ? updated.getStockQuantity() : 0));
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/products/{id}/status")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Product> updateProductStatus(@PathVariable("id") UUID id, @RequestBody Map<String, Object> payload) {
        Boolean isActive = (Boolean) payload.get("is_active");
        Product updated = adminProductService.updateProductStatus(id, isActive);
        auditLogService.logAction("PRODUCT_STATUS_TOGGLED", "product", id.toString(),
                Map.of("is_active", Boolean.TRUE.equals(isActive), "name", updated.getName() != null ? updated.getName() : "N/A"));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") UUID id) {
        adminProductService.deleteProduct(id);
        auditLogService.logAction("PRODUCT_DELETED", "product", id.toString(),
                Map.of("message", "Product deleted by admin"));
        return ResponseEntity.noContent().build();
    }
}
