package com.durgashakti.order.repository;

import com.durgashakti.common.entity.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactOrderRepository extends JpaRepository<Contact, UUID> {
    
    @Query(value = "SELECT * FROM contacts WHERE CAST(id AS text) LIKE :prefix%", nativeQuery = true)
    Optional<Contact> findByUuidPrefix(@Param("prefix") String prefix);
}
