package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Product;
import com.durgashakti.admin.service.AdminProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminProductController {

    private final AdminProductService adminProductService;

    public AdminProductController(AdminProductService adminProductService) {
        this.adminProductService = adminProductService;
    }

    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> listAll() {
        List<Product> products = adminProductService.listAll();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("items", products);
        response.put("total", products.size());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/products")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        return ResponseEntity.ok(adminProductService.createProduct(product));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable("id") UUID id, @RequestBody Product product) {
        return ResponseEntity.ok(adminProductService.updateProduct(id, product));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") UUID id) {
        adminProductService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
