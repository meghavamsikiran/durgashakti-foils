package com.durgashakti.auth.repository;

import com.durgashakti.common.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuthCartRepository extends JpaRepository<Cart, UUID> {
}
