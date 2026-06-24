package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Category;
import com.durgashakti.admin.repository.AdminCategoryRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminCategoryService {

    private final AdminCategoryRepository categoryRepository;

    public AdminCategoryService(AdminCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<Category> listAll() {
        return categoryRepository.findAll();
    }

    public Category create(Category category) {
        category.setCreatedAt(OffsetDateTime.now());
        category.setUpdatedAt(OffsetDateTime.now());
        return categoryRepository.save(category);
    }

    public Category update(UUID id, Category updatedCategory) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));

        cat.setName(updatedCategory.getName());
        cat.setIsActive(updatedCategory.getIsActive());
        cat.setGlobalDiscountEnabled(updatedCategory.getGlobalDiscountEnabled());
        cat.setGlobalDiscountPercent(updatedCategory.getGlobalDiscountPercent());
        cat.setUpdatedAt(OffsetDateTime.now());

        return categoryRepository.save(cat);
    }

    public void delete(UUID id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        categoryRepository.delete(cat);
    }
}
