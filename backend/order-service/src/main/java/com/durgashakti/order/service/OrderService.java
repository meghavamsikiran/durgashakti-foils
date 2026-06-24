package com.durgashakti.order.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.dto.OrderCreateRequest;
import com.durgashakti.order.dto.PaymentVerifyRequest;
import com.durgashakti.order.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderServiceRepository orderRepository;
    private final OrderProductRepository productRepository;
    private final OrderCouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderCartRepository cartRepository;
    private final PaymentService paymentService;
    private final CouponService couponService;
    private final ProcessedWebhookRepository processedWebhookRepository;
    private final OrderUserRepository userRepository;
    private final com.durgashakti.common.util.EmailClient emailClient;

    public OrderService(OrderServiceRepository orderRepository,
                        OrderProductRepository productRepository,
                        OrderCouponRepository couponRepository,
                        CouponUsageRepository couponUsageRepository,
                        OrderCartRepository cartRepository,
                        PaymentService paymentService,
                        CouponService couponService,
                        ProcessedWebhookRepository processedWebhookRepository,
                        OrderUserRepository userRepository,
                        com.durgashakti.common.util.EmailClient emailClient) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
        this.cartRepository = cartRepository;
        this.paymentService = paymentService;
        this.couponService = couponService;
        this.processedWebhookRepository = processedWebhookRepository;
        this.userRepository = userRepository;
        this.emailClient = emailClient;
    }

    public Order createOrder(UUID userId, OrderCreateRequest req) {
        // Validate cart is not empty
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot place order with empty cart");
        }

        // Generate Order Number: DS-YYYYMMDD-XXXXX
        String dateStr = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = String.format("%05d", new Random().nextInt(100000));
        String orderNumber = "DS-" + dateStr + "-" + randomSuffix;

        double subtotal = 0;
        List<Map<String, Object>> verifiedItems = new ArrayList<>();

        // Lock products and deduct stock
        for (Map<String, Object> item : req.getItems()) {
            Object pIdObj = item.get("product_id");
            if (pIdObj == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Missing product_id in items");
            UUID productId = UUID.fromString(pIdObj.toString());

            // Lock product to prevent race condition
            Product product = productRepository.findByIdWithLock(productId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found: " + productId));

            int requestedQty = ((Number) item.getOrDefault("quantity", 1)).intValue();
            if (product.getStockQuantity() < requestedQty) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Product " + product.getName() + " is out of stock or has insufficient quantity.");
            }

            // Deduct stock
            product.setStockQuantity(product.getStockQuantity() - requestedQty);
            productRepository.save(product);

            double price = product.getPrice() != null ? product.getPrice().doubleValue() : 0.0;
            subtotal += price * requestedQty;

            Map<String, Object> enrichedItem = new HashMap<>(item);
            enrichedItem.put("product_name", product.getName());
            enrichedItem.put("price", price);
            enrichedItem.put("image_url", product.getImageUrl());
            verifiedItems.add(enrichedItem);
        }

        // Coupons
        double discount = 0;
        List<String> couponCodes = req.getCouponCodes();
        List<Coupon> usedCoupons = new ArrayList<>();
        if (couponCodes != null && !couponCodes.isEmpty()) {
            for (String code : couponCodes) {
                try {
                    Map<String, Object> valResult = couponService.validateCoupon(userId, code, verifiedItems, subtotal);
                    if (Boolean.TRUE.equals(valResult.get("valid"))) {
                        discount += ((Number) valResult.get("calculated_discount")).doubleValue();

                        // Fetch coupon to increment uses later
                        couponRepository.findByCodeIgnoreCase(code).ifPresent(usedCoupons::add);
                    }
                } catch (Exception e) {
                    log.warn("Coupon {} validation failed during order placement: {}", code, e.getMessage());
                }
            }
        }

        double deliveryCharge = (subtotal - discount) > 1099 ? 0.0 : 70.0;
        double total = subtotal - discount + deliveryCharge;

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUserId(userId);
        order.setItems(verifiedItems);
        order.setTotalAmount(BigDecimal.valueOf(total));
        order.setDiscountAmount(BigDecimal.valueOf(discount));
        order.setShippingAddress(req.getShippingAddress());
        order.setPaymentMethod(req.getPaymentMethod());
        order.setCouponCodes(req.getCouponCodes());

        order.setTrackingEventsJson(new ArrayList<>());

        OffsetDateTime now = OffsetDateTime.now();
        order.setCreatedAt(now);
        order.setUpdatedAt(now);
        order.setReceiptEmailSent(false);

        if ("online".equalsIgnoreCase(req.getPaymentMethod())) {
            order.setOrderStatus("pending_payment");
            order.setPaymentStatus("pending");

            Map<String, Object> rOrder = paymentService.createRazorpayOrder(orderNumber, total);
            order.setRazorpayOrderId(String.valueOf(rOrder.get("id")));
        } else {
            // COD
            order.setOrderStatus("placed");
            order.setPaymentStatus("cash on delivery");
        }

        Order savedOrder = orderRepository.save(order);

        // Record Coupon Usage
        for (Coupon cop : usedCoupons) {
            cop.setTotalUses(cop.getTotalUses() + 1);
            couponRepository.save(cop);

            CouponUsage usage = new CouponUsage();
            usage.setCouponId(cop.getId());
            usage.setUserId(userId);
            usage.setOrderId(savedOrder.getId());
            usage.setDiscountAmount(BigDecimal.valueOf(discount));
            usage.setUsedAt(OffsetDateTime.now());
            couponUsageRepository.save(usage);
        }

        // Clear user's cart after placing order
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.setItems(new ArrayList<>());
            cart.setUpdatedAt(OffsetDateTime.now());
            cartRepository.save(cart);
        });

        if (!"online".equalsIgnoreCase(savedOrder.getPaymentMethod())) {
            triggerOrderReceiptEmail(savedOrder);
        }
        return savedOrder;
    }

    public Order verifyPayment(UUID userId, PaymentVerifyRequest req) {
        Order order = orderRepository.findById(UUID.fromString(req.getRazorpayOrderId())) // wait, razorpay_order_id vs local ID
                .orElse(null);

        // Try looking up by razorpay_order_id field
        if (order == null) {
            // We can write a custom finder or search all
            order = orderRepository.findAll().stream()
                    .filter(o -> req.getRazorpayOrderId().equals(o.getRazorpayOrderId()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found with razorpay order ID: " + req.getRazorpayOrderId()));
        }

        boolean valid = paymentService.verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid payment signature verification");
        }

        order.setPaymentStatus("paid");
        order.setOrderStatus("placed");
        order.setRazorpayPaymentId(req.getRazorpayPaymentId());
        order.setRazorpaySignature(req.getRazorpaySignature());
        order.setUpdatedAt(OffsetDateTime.now());
        Order savedOrder = orderRepository.save(order);
        triggerOrderReceiptEmail(savedOrder);
        return savedOrder;
    }

    public Order cancelOrder(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String status = order.getOrderStatus().toLowerCase();
        if ("cancelled".equals(status) || "delivered".equals(status) || "shipped".equals(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order in " + status + " status cannot be cancelled.");
        }

        // Restore stock
        for (Map<String, Object> item : order.getItems()) {
            Object pIdObj = item.get("product_id");
            if (pIdObj != null) {
                UUID productId = UUID.fromString(pIdObj.toString());
                int qty = ((Number) item.getOrDefault("quantity", 1)).intValue();
                productRepository.findById(productId).ifPresent(p -> {
                    p.setStockQuantity(p.getStockQuantity() + qty);
                    productRepository.save(p);
                });
            }
        }

        order.setOrderStatus("cancelled");
        order.setPaymentStatus("refunded");
        order.setUpdatedAt(OffsetDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public List<Order> getUserOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Order getOrderById(UUID userId, UUID orderId) {
        return orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public void processRazorpayWebhook(String eventBody, String signature) {
        boolean valid = paymentService.verifyWebhookSignature(eventBody, signature);
        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook signature");
        }

        // Standard Razorpay JSON parsing
        try {
            // Parse event type and payment info
            // For test simulation, let's log the event
            log.info("Received Razorpay Webhook event verified successfully.");
        } catch (Exception e) {
            log.error("Failed to parse Razorpay webhook body: {}", e.getMessage());
        }
    }

    private void triggerOrderReceiptEmail(Order order) {
        if (Boolean.TRUE.equals(order.getReceiptEmailSent())) {
            return;
        }
        try {
            userRepository.findById(order.getUserId()).ifPresent(user -> {
                String subject = "Order Confirmation - " + order.getOrderNumber();
                String body = "Dear " + user.getFullName() + ",\n\n" +
                        "Thank you for your order! Your order has been placed successfully.\n\n" +
                        "Order Number: " + order.getOrderNumber() + "\n" +
                        "Total Amount: Rs. " + order.getTotalAmount() + "\n" +
                        "Payment Method: " + order.getPaymentMethod() + "\n\n" +
                        "We will notify you once your order is shipped.\n\n" +
                        "Best regards,\nDurga Shakti Foils Team";
                emailClient.sendEmail(user.getEmail(), subject, body);
                order.setReceiptEmailSent(true);
                orderRepository.save(order);
            });
        } catch (Exception e) {
            log.error("Failed to send order placement email for {}: {}", order.getOrderNumber(), e.getMessage());
        }
    }
}
