package com.durgashakti.order.repository;

import com.durgashakti.common.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrderUserRepository extends JpaRepository<User, UUID> {
}
