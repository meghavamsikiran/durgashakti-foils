package com.durgashakti.user.repository;

import com.durgashakti.common.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByIdIn(List<UUID> ids);
}
