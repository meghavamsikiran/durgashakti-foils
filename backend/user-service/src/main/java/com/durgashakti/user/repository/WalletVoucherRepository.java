package com.durgashakti.user.repository;

import com.durgashakti.common.entity.WalletVoucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WalletVoucherRepository extends JpaRepository<WalletVoucher, UUID> {
    Optional<WalletVoucher> findByCodeIgnoreCase(String code);
    List<WalletVoucher> findByAssignedUserIdOrderByCreatedAtDesc(UUID assignedUserId);
    List<WalletVoucher> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("SELECT v FROM WalletVoucher v WHERE (v.assignedUserId = :assignedUserId OR (v.assignedUserId IS NULL AND v.isRedeemed = false)) ORDER BY v.createdAt DESC")
    List<WalletVoucher> findAvailableAndAssignedVouchers(UUID assignedUserId);
}
