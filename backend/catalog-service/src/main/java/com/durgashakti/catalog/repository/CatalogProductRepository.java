package com.durgashakti.catalog.repository;

import com.durgashakti.common.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CatalogProductRepository extends JpaRepository<Product, UUID> {
    Page<Product> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(LOWER(p.name) LIKE LOWER(:search) OR " +
           "LOWER(p.batchNo) LIKE LOWER(:search) OR " +
           "LOWER(p.variantSku) LIKE LOWER(:search))")
    Page<Product> findByIsActiveTrueAndSearchQuery(@Param("search") String search, Pageable pageable);
}
