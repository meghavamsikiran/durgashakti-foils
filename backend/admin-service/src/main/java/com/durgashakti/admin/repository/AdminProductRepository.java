package com.durgashakti.admin.repository;

import com.durgashakti.common.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminProductRepository extends JpaRepository<Product, UUID> {
}
