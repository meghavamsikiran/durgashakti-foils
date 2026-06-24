package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Category;
import com.durgashakti.admin.service.AdminCategoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminCategoryController {

    private final AdminCategoryService adminCategoryService;

    public AdminCategoryController(AdminCategoryService adminCategoryService) {
        this.adminCategoryService = adminCategoryService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> listAll() {
        return ResponseEntity.ok(adminCategoryService.listAll());
    }

    @PostMapping("/categories")
    public ResponseEntity<Category> create(@RequestBody Category category) {
        return ResponseEntity.ok(adminCategoryService.create(category));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<Category> update(@PathVariable("id") UUID id, @RequestBody Category category) {
        return ResponseEntity.ok(adminCategoryService.update(id, category));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        adminCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
