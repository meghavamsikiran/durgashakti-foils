package com.durgashakti.user.controller;

import com.durgashakti.common.entity.Wallet;
import com.durgashakti.common.entity.WalletTransaction;
import com.durgashakti.common.entity.WalletVoucher;
import com.durgashakti.user.repository.WalletRepository;
import com.durgashakti.user.repository.WalletTransactionRepository;
import com.durgashakti.user.repository.WalletVoucherRepository;
import com.durgashakti.user.repository.UserProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
public class WalletController {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WalletVoucherRepository walletVoucherRepository;
    private final UserProfileRepository userRepository;

    public WalletController(WalletRepository walletRepository,
                            WalletTransactionRepository walletTransactionRepository,
                            WalletVoucherRepository walletVoucherRepository,
                            UserProfileRepository userRepository) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.walletVoucherRepository = walletVoucherRepository;
        this.userRepository = userRepository;
    }

    // ── CUSTOMER WALLET ENDPOINTS ──

    @GetMapping("/user/wallet")
    public ResponseEntity<Map<String, Object>> getWallet(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> walletRepository.save(new Wallet(userId, BigDecimal.ZERO)));

        List<WalletTransaction> transactions = walletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("balance", wallet.getBalance());
        response.put("transactions", transactions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/user/wallet/reset")
    public ResponseEntity<Map<String, Object>> resetWallet(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        
        Optional<Wallet> walletOpt = walletRepository.findByUserId(userId);
        if (walletOpt.isPresent()) {
            Wallet wallet = walletOpt.get();
            wallet.setBalance(BigDecimal.ZERO);
            wallet.setUpdatedAt(OffsetDateTime.now());
            walletRepository.save(wallet);
        }

        List<WalletTransaction> userTxs = walletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (!userTxs.isEmpty()) {
            walletTransactionRepository.deleteAll(userTxs);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newBalance", BigDecimal.ZERO,
                "message", "Wallet balance reset to ₹0.00 successfully"
        ));
    }

    @PostMapping("/user/wallet/create-topup-order")
    public ResponseEntity<Map<String, Object>> createTopUpOrder(@RequestBody Map<String, Object> body, Authentication authentication) {
        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        if (amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid top-up amount"));
        }

        long amountInPaise = Math.round(amountVal * 100);
        String receipt = "wal_" + System.currentTimeMillis();

        String razorpayKey = System.getenv("RAZORPAY_KEY_ID");
        String razorpaySecret = System.getenv("RAZORPAY_KEY_SECRET");

        if (razorpayKey != null && !razorpayKey.isBlank() && !razorpayKey.startsWith("fake") &&
            razorpaySecret != null && !razorpaySecret.isBlank() && !razorpaySecret.startsWith("fake")) {
            try {
                com.razorpay.RazorpayClient client = new com.razorpay.RazorpayClient(razorpayKey, razorpaySecret);
                org.json.JSONObject orderRequest = new org.json.JSONObject();
                orderRequest.put("amount", amountInPaise);
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", receipt);

                com.razorpay.Order order = client.orders.create(orderRequest);
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "razorpay_order_id", order.get("id"),
                        "amount", amountInPaise,
                        "key", razorpayKey
                ));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to create payment order: " + e.getMessage()));
            }
        }

        // Development/Test fallback when Razorpay credentials are not set
        return ResponseEntity.ok(Map.of(
                "success", true,
                "razorpay_order_id", "order_test_" + System.currentTimeMillis(),
                "amount", amountInPaise,
                "key", razorpayKey != null ? razorpayKey : "rzp_test_fallback"
        ));
    }

    @PostMapping("/user/wallet/topup")
    public ResponseEntity<Map<String, Object>> topUpWallet(@RequestBody Map<String, Object> body, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        
        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        String razorpayPaymentId = (String) body.get("razorpay_payment_id");
        String razorpayOrderId = (String) body.get("razorpay_order_id");
        String razorpaySignature = (String) body.get("razorpay_signature");

        if (amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid top-up amount"));
        }

        BigDecimal amount = BigDecimal.valueOf(amountVal);

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> new Wallet(userId, BigDecimal.ZERO));

        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(OffsetDateTime.now());
        walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction(
                userId,
                amount,
                "CREDIT",
                "TOPUP",
                razorpayPaymentId != null ? razorpayPaymentId : "TXN-" + System.currentTimeMillis(),
                "Wallet top-up via Razorpay (" + (razorpayOrderId != null ? razorpayOrderId : "Direct") + ")",
                "SUCCESS"
        );
        walletTransactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newBalance", wallet.getBalance(),
                "message", "Successfully added ₹" + amountVal + " to your wallet!"
        ));
    }

    @PostMapping("/user/wallet/redeem-voucher")
    public ResponseEntity<Map<String, Object>> redeemVoucher(@RequestBody Map<String, String> body, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        String code = body.get("code");

        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Please enter a valid voucher code"));
        }

        Optional<WalletVoucher> voucherOpt = walletVoucherRepository.findByCodeIgnoreCase(code.trim());
        if (voucherOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid or expired voucher code"));
        }

        WalletVoucher voucher = voucherOpt.get();
        if (Boolean.TRUE.equals(voucher.getIsRedeemed())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "This voucher has already been redeemed"));
        }

        if (voucher.getExpiryDate() != null && voucher.getExpiryDate().isBefore(OffsetDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "This voucher has expired"));
        }

        if (voucher.getAssignedUserId() != null && !voucher.getAssignedUserId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "This voucher is assigned to another customer"));
        }

        // Credit to customer wallet
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> new Wallet(userId, BigDecimal.ZERO));

        wallet.setBalance(wallet.getBalance().add(voucher.getAmount()));
        wallet.setUpdatedAt(OffsetDateTime.now());
        walletRepository.save(wallet);

        // Mark voucher redeemed
        voucher.setIsRedeemed(true);
        voucher.setRedeemedByUserId(userId);
        voucher.setRedeemedAt(OffsetDateTime.now());
        walletVoucherRepository.save(voucher);

        // Record transaction
        WalletTransaction tx = new WalletTransaction(
                userId,
                voucher.getAmount(),
                "CREDIT",
                "VOUCHER",
                voucher.getCode(),
                "Redeemed Voucher: " + (voucher.getTitle() != null ? voucher.getTitle() : voucher.getCode()),
                "SUCCESS"
        );
        walletTransactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "amount", voucher.getAmount(),
                "newBalance", wallet.getBalance(),
                "message", "Successfully redeemed ₹" + voucher.getAmount() + " voucher!"
        ));
    }

    // ── SUPERADMIN WALLET & VOUCHER ENDPOINTS ──

    @PostMapping("/admin/wallet/credit")
    public ResponseEntity<Map<String, Object>> adminDirectCredit(@RequestBody Map<String, Object> body, Authentication authentication) {
        String targetUserIdStr = (String) body.get("userId");
        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        String remark = (String) body.getOrDefault("remark", "Admin Credit");

        if (targetUserIdStr == null || amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid user ID or amount"));
        }

        UUID targetUserId = UUID.fromString(targetUserIdStr);
        BigDecimal amount = BigDecimal.valueOf(amountVal);

        Wallet wallet = walletRepository.findByUserId(targetUserId)
                .orElseGet(() -> new Wallet(targetUserId, BigDecimal.ZERO));

        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(OffsetDateTime.now());
        walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction(
                targetUserId,
                amount,
                "CREDIT",
                "ADMIN_CREDIT",
                "ADMIN-" + System.currentTimeMillis(),
                remark,
                "SUCCESS"
        );
        walletTransactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newBalance", wallet.getBalance(),
                "message", "Credited ₹" + amountVal + " to customer wallet successfully!"
        ));
    }

    @PostMapping("/admin/wallet/vouchers")
    public ResponseEntity<Map<String, Object>> createVoucher(@RequestBody Map<String, Object> body, Authentication authentication) {
        String code = (String) body.get("code");
        String title = (String) body.get("title");
        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        String assignedUserIdStr = (String) body.get("assignedUserId");

        if (code == null || code.isBlank() || amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Code and positive amount are required"));
        }

        WalletVoucher voucher = new WalletVoucher();
        voucher.setCode(code.trim().toUpperCase());
        voucher.setTitle(title != null ? title : "Wallet Bonus Voucher");
        voucher.setAmount(BigDecimal.valueOf(amountVal));
        if (assignedUserIdStr != null && !assignedUserIdStr.isBlank()) {
            voucher.setAssignedUserId(UUID.fromString(assignedUserIdStr));
            userRepository.findById(UUID.fromString(assignedUserIdStr)).ifPresent(u -> voucher.setAssignedUserEmail(u.getEmail()));
        }
        voucher.setCreatedAt(OffsetDateTime.now());
        if (authentication != null && authentication.getPrincipal() != null) {
            try {
                voucher.setCreatedBy(UUID.fromString((String) authentication.getPrincipal()));
            } catch (Exception ignored) {}
        }

        walletVoucherRepository.save(voucher);

        return ResponseEntity.ok(Map.of("success", true, "voucher", voucher));
    }

    @GetMapping("/admin/wallet/vouchers")
    public ResponseEntity<List<WalletVoucher>> getAllVouchers() {
        return ResponseEntity.ok(walletVoucherRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/admin/wallet/transactions")
    public ResponseEntity<List<WalletTransaction>> getAllWalletTransactions() {
        return ResponseEntity.ok(walletTransactionRepository.findAllByOrderByCreatedAtDesc());
    }
}
