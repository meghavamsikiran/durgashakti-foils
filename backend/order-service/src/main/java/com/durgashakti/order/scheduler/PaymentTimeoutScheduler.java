package com.durgashakti.order.scheduler;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.Product;
import com.durgashakti.order.repository.OrderServiceRepository;
import com.durgashakti.order.repository.OrderProductRepository;
import com.durgashakti.order.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class PaymentTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentTimeoutScheduler.class);

    private final OrderServiceRepository orderRepository;
    private final OrderProductRepository productRepository;
    private final PaymentService paymentService;

    public PaymentTimeoutScheduler(OrderServiceRepository orderRepository, 
                                   OrderProductRepository productRepository,
                                   PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentService = paymentService;
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

            // Restore product stock
            List<Map<String, Object>> items = order.getItems();
            if (items != null) {
                for (Map<String, Object> item : items) {
                    Object pIdObj = item.get("product_id");
                    if (pIdObj != null) {
                        UUID productId = UUID.fromString(pIdObj.toString());
                        int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                        productRepository.findById(productId).ifPresent(p -> {
                            p.setStockQuantity(p.getStockQuantity() + qty);
                            productRepository.save(p);
                            log.info("Restored stock of product {} by quantity {} due to timeout of order {}", productId, qty, order.getOrderNumber());
                        });
                    }
                }
            }

            orderRepository.save(order);
            log.info("Order {} cancelled due to 15-minute payment session timeout.", order.getOrderNumber());
        }
    }
}
