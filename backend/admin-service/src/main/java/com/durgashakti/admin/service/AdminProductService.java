package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Product;
import java.util.List;
import java.util.UUID;

public interface AdminProductService {
    List<Product> listAll();
    Product createProduct(Product product);
    Product updateProduct(UUID id, Product updatedProduct);
    void deleteProduct(UUID id);
}
