package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Product;
import com.durgashakti.admin.repository.AdminProductRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminProductService {

    private final AdminProductRepository productRepository;

    public AdminProductService(AdminProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> listAll() {
        return productRepository.findAll();
    }

    public Product createProduct(Product product) {
        product.setCreatedAt(OffsetDateTime.now());
        product.setUpdatedAt(OffsetDateTime.now());
        return productRepository.save(product);
    }

    public Product updateProduct(UUID id, Product updatedProduct) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        p.setName(updatedProduct.getName());
        p.setDescription(updatedProduct.getDescription());
        p.setPrice(updatedProduct.getPrice());
        p.setDiscountPrice(updatedProduct.getDiscountPrice());
        p.setStockQuantity(updatedProduct.getStockQuantity());
        p.setIsActive(updatedProduct.getIsActive());
        p.setVariantSku(updatedProduct.getVariantSku());
        p.setBatchNo(updatedProduct.getBatchNo());
        p.setImageUrl(updatedProduct.getImageUrl());
        p.setMediaUrls(updatedProduct.getMediaUrls());
        p.setFeatures(updatedProduct.getFeatures());
        p.setUpdatedAt(OffsetDateTime.now());

        return productRepository.save(p);
    }

    public void deleteProduct(UUID id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.delete(p);
    }
}
