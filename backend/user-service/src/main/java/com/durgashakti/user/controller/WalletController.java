package com.durgashakti.user.controller;

import com.durgashakti.common.entity.Wallet;
import com.durgashakti.common.entity.WalletTransaction;
import com.durgashakti.common.entity.WalletVoucher;
import com.durgashakti.user.repository.WalletRepository;
import com.durgashakti.user.repository.WalletTransactionRepository;
import com.durgashakti.user.repository.WalletVoucherRepository;
import com.durgashakti.user.repository.UserProfileRepository;
import com.razorpay.Utils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
public class WalletController {

    private static final Logger log = LoggerFactory.getLogger(WalletController.class);

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WalletVoucherRepository walletVoucherRepository;
    private final UserProfileRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public WalletController(WalletRepository walletRepository,
                            WalletTransactionRepository walletTransactionRepository,
                            WalletVoucherRepository walletVoucherRepository,
                            UserProfileRepository userRepository,
                            JdbcTemplate jdbcTemplate) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.walletVoucherRepository = walletVoucherRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    private Map<String, Object> checkWalletEnabled() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT value FROM settings WHERE key = 'wallet_settings'");
            if (!rows.isEmpty() && rows.get(0).get("value") != null) {
                Object valObj = rows.get(0).get("value");
                Map<String, Object> map = null;
                if (valObj instanceof Map) {
                    map = (Map<String, Object>) valObj;
                } else {
                    String jsonStr = valObj.toString();
                    if (jsonStr != null && !jsonStr.isBlank()) {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        map = mapper.readValue(jsonStr, Map.class);
                    }
                }
                if (map != null) {
                    boolean enabled = !Boolean.FALSE.equals(map.get("enabled"));
                    if (!enabled) {
                        String reason = map.get("disabled_reason") != null ? String.valueOf(map.get("disabled_reason")) : "DSF Wallet system is currently disabled by store management.";
                        return Map.of("enabled", false, "reason", reason);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to check wallet_settings", e);
        }
        return Map.of("enabled", true);
    }

    // ── CUSTOMER WALLET ENDPOINTS ──

    @GetMapping("/user/wallet")
    public ResponseEntity<Map<String, Object>> getWallet(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> new Wallet(userId, BigDecimal.ZERO));

        List<WalletTransaction> transactions = walletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("balance", wallet.getBalance());
        response.put("transactions", transactions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/user/wallet/create-topup-order")
    public ResponseEntity<Map<String, Object>> createTopUpOrder(@RequestBody Map<String, Object> body, Authentication authentication) {
        Map<String, Object> walletStatus = checkWalletEnabled();
        if (Boolean.FALSE.equals(walletStatus.get("enabled"))) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", walletStatus.get("reason")));
        }

        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        if (amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid top-up amount"));
        }

        if (amountVal > 50000) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Maximum wallet top-up limit per transaction is ₹50,000"));
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

    @Transactional
    @PostMapping("/user/wallet/topup")
    public ResponseEntity<Map<String, Object>> topUpWallet(@RequestBody Map<String, Object> body, Authentication authentication) {
        Map<String, Object> walletStatus = checkWalletEnabled();
        if (Boolean.FALSE.equals(walletStatus.get("enabled"))) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", walletStatus.get("reason")));
        }

        UUID userId = UUID.fromString((String) authentication.getPrincipal());

        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        String razorpayPaymentId = (String) body.get("razorpay_payment_id");
        String razorpayOrderId = (String) body.get("razorpay_order_id");
        String razorpaySignature = (String) body.get("razorpay_signature");

        if (amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid top-up amount"));
        }

        if (amountVal > 50000) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Top-up amount exceeds maximum threshold of ₹50,000"));
        }

        // Signature Verification
        String razorpaySecret = System.getenv("RAZORPAY_KEY_SECRET");
        boolean isLiveRazorpay = razorpaySecret != null && !razorpaySecret.isBlank() && !razorpaySecret.startsWith("fake");

        if (isLiveRazorpay) {
            if (razorpayPaymentId == null || razorpayOrderId == null || razorpaySignature == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing Razorpay payment parameters for verification"));
            }

            try {
                org.json.JSONObject attributes = new org.json.JSONObject();
                attributes.put("razorpay_order_id", razorpayOrderId);
                attributes.put("razorpay_payment_id", razorpayPaymentId);
                attributes.put("razorpay_signature", razorpaySignature);

                boolean isValidSignature = Utils.verifyPaymentSignature(attributes, razorpaySecret);
                if (!isValidSignature) {
                    log.warn("Wallet topup signature verification failed for user {} order {}", userId, razorpayOrderId);
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid Razorpay payment signature"));
                }
            } catch (Exception e) {
                log.error("Signature verification error for user {}: {}", userId, e.getMessage());
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Payment signature verification failed"));
            }
        }

        BigDecimal amount = BigDecimal.valueOf(amountVal);

        // Idempotency Check using DB index (O(1) lookup)
        if (razorpayPaymentId != null && !razorpayPaymentId.isBlank()) {
            boolean alreadyProcessed = walletTransactionRepository.existsByReferenceId(razorpayPaymentId);
            if (alreadyProcessed) {
                Wallet wallet = walletRepository.findByUserId(userId)
                        .orElseGet(() -> new Wallet(userId, BigDecimal.ZERO));
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "newBalance", wallet.getBalance(),
                        "message", "Payment already processed."
                ));
            }
        }

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

    @Transactional
    @PostMapping("/user/wallet/redeem-voucher")
    public ResponseEntity<Map<String, Object>> redeemVoucher(@RequestBody Map<String, String> body, Authentication authentication) {
        Map<String, Object> walletStatus = checkWalletEnabled();
        if (Boolean.FALSE.equals(walletStatus.get("enabled"))) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", walletStatus.get("reason")));
        }

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

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional
    @PostMapping("/admin/wallet/credit")
    public ResponseEntity<Map<String, Object>> adminDirectCredit(@RequestBody Map<String, Object> body, Authentication authentication) {
        List<String> targetUserIds = new ArrayList<>();
        if (body.containsKey("userIds") && body.get("userIds") instanceof List) {
            targetUserIds = (List<String>) body.get("userIds");
        } else if (body.containsKey("userId") && body.get("userId") != null) {
            targetUserIds.add((String) body.get("userId"));
        }

        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());
        String remark = (String) body.getOrDefault("remark", "Admin Credit");

        if (targetUserIds.isEmpty() || amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid user ID(s) or amount"));
        }

        BigDecimal amount = BigDecimal.valueOf(amountVal);
        String refPrefix = "ADMIN-" + System.currentTimeMillis();

        for (int i = 0; i < targetUserIds.size(); i++) {
            UUID targetUserId = UUID.fromString(targetUserIds.get(i));
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
                    refPrefix + "-" + i,
                    remark,
                    "SUCCESS"
            );
            walletTransactionRepository.save(tx);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Credited ₹" + amountVal + " to " + targetUserIds.size() + " customer(s) successfully!"
        ));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Transactional
    @PostMapping("/admin/wallet/vouchers")
    public ResponseEntity<Map<String, Object>> createVoucher(@RequestBody Map<String, Object> body, Authentication authentication) {
        String baseCode = (String) body.get("code");
        String title = (String) body.get("title");
        double amountVal = Double.parseDouble(body.getOrDefault("amount", 0).toString());

        List<String> assignedUserIds = new ArrayList<>();
        if (body.containsKey("assignedUserIds") && body.get("assignedUserIds") instanceof List) {
            assignedUserIds = (List<String>) body.get("assignedUserIds");
        } else if (body.containsKey("assignedUserId") && body.get("assignedUserId") != null) {
            String auId = (String) body.get("assignedUserId");
            if (!auId.isBlank()) {
                assignedUserIds.add(auId);
            }
        }

        if (baseCode == null || baseCode.isBlank() || amountVal <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Code and positive amount are required"));
        }

        baseCode = baseCode.trim().toUpperCase();

        UUID createdBy = null;
        if (authentication != null && authentication.getPrincipal() != null) {
            try {
                createdBy = UUID.fromString((String) authentication.getPrincipal());
            } catch (Exception ignored) {}
        }

        List<WalletVoucher> createdVouchers = new ArrayList<>();

        if (assignedUserIds.isEmpty()) {
            if (walletVoucherRepository.findByCodeIgnoreCase(baseCode).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Voucher code '" + baseCode + "' already exists. Please use a unique code."));
            }

            // Global voucher
            WalletVoucher voucher = new WalletVoucher();
            voucher.setCode(baseCode);
            voucher.setTitle(title != null ? title : "Wallet Bonus Voucher");
            voucher.setAmount(BigDecimal.valueOf(amountVal));
            voucher.setCreatedAt(OffsetDateTime.now());
            voucher.setCreatedBy(createdBy);
            walletVoucherRepository.save(voucher);
            createdVouchers.add(voucher);
        } else {
            // Multiple user-specific vouchers
            for (int i = 0; i < assignedUserIds.size(); i++) {
                String userIdStr = assignedUserIds.get(i);
                WalletVoucher voucher = new WalletVoucher();
                // If more than 1 user, append a suffix to keep codes unique
                String targetCode = assignedUserIds.size() > 1 ? baseCode + "-" + (i + 1) : baseCode;

                if (walletVoucherRepository.findByCodeIgnoreCase(targetCode).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Voucher code '" + targetCode + "' already exists. Please use a unique code."));
                }

                voucher.setCode(targetCode);
                voucher.setTitle(title != null ? title : "Wallet Bonus Voucher");
                voucher.setAmount(BigDecimal.valueOf(amountVal));
                voucher.setCreatedAt(OffsetDateTime.now());
                voucher.setCreatedBy(createdBy);

                UUID uid = UUID.fromString(userIdStr);
                voucher.setAssignedUserId(uid);
                userRepository.findById(uid).ifPresent(u -> voucher.setAssignedUserEmail(u.getEmail()));

                walletVoucherRepository.save(voucher);
                createdVouchers.add(voucher);
            }
        }

        return ResponseEntity.ok(Map.of("success", true, "vouchers", createdVouchers, "message", "Generated " + createdVouchers.size() + " voucher(s)"));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @GetMapping("/admin/wallet/vouchers")
    public ResponseEntity<List<WalletVoucher>> getAllVouchers() {
        List<WalletVoucher> list = walletVoucherRepository.findAllByOrderByCreatedAtDesc();
        list.forEach(v -> {
            if (v.getAssignedUserId() != null && (v.getAssignedUserEmail() == null || v.getAssignedUserEmail().isBlank())) {
                userRepository.findById(v.getAssignedUserId()).ifPresent(u -> v.setAssignedUserEmail(u.getEmail()));
            }
        });
        return ResponseEntity.ok(list);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @GetMapping("/admin/wallet/transactions")
    public ResponseEntity<List<WalletTransaction>> getAllWalletTransactions() {
        return ResponseEntity.ok(walletTransactionRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/user/wallet/vouchers")
    public ResponseEntity<List<WalletVoucher>> getMyVouchers(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(walletVoucherRepository.findAvailableAndAssignedVouchers(userId));
    }
}
