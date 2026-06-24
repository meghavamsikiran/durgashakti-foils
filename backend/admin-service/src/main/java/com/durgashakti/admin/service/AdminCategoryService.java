package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Category;
import java.util.List;
import java.util.UUID;

public interface AdminCategoryService {
    List<Category> listAll();
    Category create(Category category);
    Category update(UUID id, Category updatedCategory);
    void delete(UUID id);
}
