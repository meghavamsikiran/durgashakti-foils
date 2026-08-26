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
    private final com.durgashakti.admin.service.AuditLogService auditLogService;

    public AdminCategoryController(AdminCategoryService adminCategoryService,
                                  com.durgashakti.admin.service.AuditLogService auditLogService) {
        this.adminCategoryService = adminCategoryService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('view_products')")
    public ResponseEntity<List<Category>> listAll() {
        return ResponseEntity.ok(adminCategoryService.listAll());
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Category> create(@RequestBody Category category) {
        Category created = adminCategoryService.create(category);
        auditLogService.logAction("CATEGORY_CREATED", "category", created.getId() != null ? created.getId().toString() : "N/A",
                java.util.Map.of("name", created.getName() != null ? created.getName() : "N/A"));
        return ResponseEntity.ok(created);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Category> update(@PathVariable("id") UUID id, @RequestBody Category category) {
        Category updated = adminCategoryService.update(id, category);
        auditLogService.logAction("CATEGORY_UPDATED", "category", id.toString(),
                java.util.Map.of("name", updated.getName() != null ? updated.getName() : "N/A"));
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('edit_products')")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        adminCategoryService.delete(id);
        auditLogService.logAction("CATEGORY_DELETED", "category", id.toString(),
                java.util.Map.of("message", "Category deleted by admin"));
        return ResponseEntity.noContent().build();
    }
}
