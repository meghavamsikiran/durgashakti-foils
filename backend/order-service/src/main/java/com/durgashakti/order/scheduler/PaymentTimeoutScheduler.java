package com.durgashakti.order.scheduler;

import com.durgashakti.common.entity.Coupon;
import com.durgashakti.common.entity.Order;
import com.durgashakti.order.repository.CouponUsageRepository;
import com.durgashakti.order.repository.OrderCouponRepository;
import com.durgashakti.order.repository.OrderProductRepository;
import com.durgashakti.order.repository.OrderServiceRepository;
import com.durgashakti.order.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class PaymentTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentTimeoutScheduler.class);

    private final OrderServiceRepository orderRepository;
    private final OrderProductRepository productRepository;
    private final OrderCouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final PaymentService paymentService;
    private final JdbcTemplate jdbcTemplate;

    public PaymentTimeoutScheduler(OrderServiceRepository orderRepository, 
                                   OrderProductRepository productRepository,
                                   OrderCouponRepository couponRepository,
                                   CouponUsageRepository couponUsageRepository,
                                   PaymentService paymentService,
                                   JdbcTemplate jdbcTemplate) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
        this.paymentService = paymentService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void cancelExpiredPendingOrders() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(15);
        List<Order> expiredOrders = orderRepository.findExpiredPaymentOrders(cutoff);

        if (expiredOrders.isEmpty()) {
            return;
        }

        log.info("Found {} orders in pending payment status for more than 15 minutes. Initiating expiration checks...", expiredOrders.size());

        for (Order order : expiredOrders) {
            // Check if the order was paid on Razorpay first to prevent cancelling successful payments
            String rzpOrderId = order.getRazorpayOrderId();
            if (rzpOrderId != null && !rzpOrderId.trim().isEmpty()) {
                try {
                    Map<String, Object> paymentEntity = paymentService.fetchSuccessfulOrderPayment(rzpOrderId);
                    if (paymentEntity != null) {
                        String status = String.valueOf(paymentEntity.get("status"));
                        if ("captured".equalsIgnoreCase(status) || "authorized".equalsIgnoreCase(status)) {
                            order.setPaymentStatus("paid");
                            order.setOrderStatus("placed");
                            if (paymentEntity.get("id") != null) {
                                order.setRazorpayPaymentId(String.valueOf(paymentEntity.get("id")));
                            }
                            order.setUpdatedAt(OffsetDateTime.now());
                            orderRepository.save(order);
                            log.info("Order {} was paid in Razorpay. Auto-reconciled during timeout check instead of cancelling.", order.getOrderNumber());
                            continue; // Skip cancellation
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to check Razorpay status for order {} during timeout check: {}", order.getOrderNumber(), e.getMessage());
                }
            }

            // If not paid, proceed to cancel
            order.setOrderStatus("cancelled");
            order.setPaymentStatus("failed");
            order.setAdminMessage("Payment session expired (15-minute timeout).");
            order.setUpdatedAt(OffsetDateTime.now());

            // 1. Restore product stock
            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    Object pIdObj = item.get("product_id");
                    if (pIdObj != null) {
                        UUID productId = UUID.fromString(pIdObj.toString());
                        int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                        productRepository.findByIdWithLock(productId).ifPresent(p -> {
                            p.setStockQuantity(p.getStockQuantity() + qty);
                            productRepository.save(p);
                            log.info("Restored stock of product {} by quantity {} due to timeout of order {}", productId, qty, order.getOrderNumber());
                        });
                    }
                }
            }

            // 2. Refund wallet balance if partial or full wallet payment was deducted during order creation
            String pMethod = (order.getPaymentMethod() != null ? order.getPaymentMethod() : "").toLowerCase();
            String pStatus = (order.getPaymentStatus() != null ? order.getPaymentStatus() : "").toLowerCase();
            if ("wallet".equals(pMethod) || "dsf_wallet".equals(pMethod) || pStatus.contains("wallet")) {
                BigDecimal refundAmt = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
                if (refundAmt.compareTo(BigDecimal.ZERO) > 0 && order.getUserId() != null) {
                    try {
                        jdbcTemplate.update(
                            "INSERT INTO wallets (id, user_id, balance, created_at, updated_at) " +
                            "VALUES (gen_random_uuid(), ?, ?, NOW(), NOW()) " +
                            "ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW()",
                            order.getUserId(), refundAmt
                        );
                        jdbcTemplate.update(
                            "INSERT INTO wallet_transactions (id, user_id, amount, type, source, reference_id, description, status, created_at) " +
                            "VALUES (gen_random_uuid(), ?, ?, 'CREDIT', 'ORDER_REFUND', ?, ?, 'SUCCESS', NOW())",
                            order.getUserId(), refundAmt, order.getOrderNumber(), "Refund for expired payment session order #" + order.getOrderNumber()
                        );
                        log.info("[Payment Timeout Wallet Refund] Refunded ₹{} to wallet for user {} on expired order {}", refundAmt, order.getUserId(), order.getOrderNumber());
                    } catch (Exception ex) {
                        log.error("[Payment Timeout Wallet Refund Failed] Order {}: {}", order.getOrderNumber(), ex.getMessage());
                    }
                }
            }

            // 3. Revert Coupon usage
            List<String> couponCodes = order.getCouponCodes();
            if (couponCodes != null && !couponCodes.isEmpty()) {
                for (String code : couponCodes) {
                    try {
                        Optional<Coupon> copOpt = couponRepository.findByCodeIgnoreCase(code.trim());
                        if (copOpt.isPresent()) {
                            Coupon cop = copOpt.get();
                            if (cop.getTotalUses() != null && cop.getTotalUses() > 0) {
                                cop.setTotalUses(cop.getTotalUses() - 1);
                                couponRepository.save(cop);
                            }
                        }
                    } catch (Exception ex) {
                        log.error("Failed to revert coupon total_uses for code {}: {}", code, ex.getMessage());
                    }
                }
                try {
                    couponUsageRepository.deleteByOrderId(order.getId());
                    log.info("Reverted coupon usage records for expired order {}", order.getOrderNumber());
                } catch (Exception ex) {
                    log.error("Failed to delete coupon usage records for order {}: {}", order.getOrderNumber(), ex.getMessage());
                }
            }

            orderRepository.save(order);
            log.info("Order {} cancelled due to 15-minute payment session timeout.", order.getOrderNumber());
        }
    }
}
