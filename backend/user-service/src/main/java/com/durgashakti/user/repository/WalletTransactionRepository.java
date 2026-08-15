package com.durgashakti.user.repository;

import com.durgashakti.common.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {
    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<WalletTransaction> findAllByOrderByCreatedAtDesc();
    boolean existsByReferenceId(String referenceId);
    Optional<WalletTransaction> findByReferenceId(String referenceId);
}
