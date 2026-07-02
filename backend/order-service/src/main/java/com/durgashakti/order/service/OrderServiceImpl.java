package com.durgashakti.order.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.dto.*;
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
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

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
    private final OrderSettingRepository settingRepository;

    public OrderServiceImpl(OrderServiceRepository orderRepository,
                            OrderProductRepository productRepository,
                            OrderCouponRepository couponRepository,
                            CouponUsageRepository couponUsageRepository,
                            OrderCartRepository cartRepository,
                            PaymentService paymentService,
                            CouponService couponService,
                            ProcessedWebhookRepository processedWebhookRepository,
                            OrderUserRepository userRepository,
                            com.durgashakti.common.util.EmailClient emailClient,
                            OrderSettingRepository settingRepository) {
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
        this.settingRepository = settingRepository;
    }

    @Override
    public Order createOrder(UUID userId, OrderCreateRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot place order with empty cart");
        }

        String dateStr = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = String.format("%05d", new Random().nextInt(100000));
        String orderNumber = "DS-" + dateStr + "-" + randomSuffix;

        double subtotal = 0;
        List<Map<String, Object>> verifiedItems = new ArrayList<>();

        for (Map<String, Object> item : req.getItems()) {
            Object pIdObj = item.get("product_id");
            if (pIdObj == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Missing product_id in items");
            UUID productId = UUID.fromString(pIdObj.toString());

            Product product = productRepository.findByIdWithLock(productId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found: " + productId));

            int requestedQty = ((Number) item.getOrDefault("quantity", 1)).intValue();
            if (product.getStockQuantity() < requestedQty) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Product " + product.getName() + " is out of stock or has insufficient quantity.");
            }

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

        double discount = 0;
        List<String> couponCodes = req.getCouponCodes();
        List<Coupon> usedCoupons = new ArrayList<>();
        if (couponCodes != null && !couponCodes.isEmpty()) {
            try {
                Map<String, Object> valResult = couponService.validateCoupons(userId, couponCodes, subtotal);
                if (Boolean.TRUE.equals(valResult.get("valid"))) {
                    discount = ((Number) valResult.get("discount_amount")).doubleValue();
                    if (valResult.get("applied_coupons") instanceof List) {
                        List<Map<String, Object>> applied = (List<Map<String, Object>>) valResult.get("applied_coupons");
                        for (Map<String, Object> cMap : applied) {
                            String codeStr = String.valueOf(cMap.get("code"));
                            couponRepository.findByCodeIgnoreCase(codeStr).ifPresent(usedCoupons::add);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Coupon validation failed during order placement: {}", e.getMessage());
            }
        }

        Optional<Setting> shippingSettingsOpt = settingRepository.findById("shipping_settings");
        double deliveryCharge = 70.0;
        
        boolean enableShipping = true;
        boolean enableFreeShipping = true;
        double freeShippingThreshold = 1099.0;
        double defaultShippingCharge = 70.0;
        boolean shippingZonesEnabled = false;
        List<Map<String, Object>> zones = new ArrayList<>();

        if (shippingSettingsOpt.isPresent()) {
            Map<String, Object> config = shippingSettingsOpt.get().getValue();
            if (config != null) {
                enableShipping = !Boolean.FALSE.equals(config.get("enableShipping")) && !"Inactive".equalsIgnoreCase(String.valueOf(config.get("shippingRuleStatus")));
                enableFreeShipping = !Boolean.FALSE.equals(config.get("enableFreeShipping"));
                
                if (config.get("freeShippingThreshold") != null) {
                    freeShippingThreshold = ((Number) config.get("freeShippingThreshold")).doubleValue();
                }
                if (config.get("defaultShippingCharge") != null) {
                    defaultShippingCharge = ((Number) config.get("defaultShippingCharge")).doubleValue();
                }
                shippingZonesEnabled = Boolean.TRUE.equals(config.get("shippingZonesEnabled"));
                if (config.get("zones") != null && config.get("zones") instanceof List) {
                    zones = (List<Map<String, Object>>) config.get("zones");
                }
            }
        }

        if (!enableShipping) {
            deliveryCharge = 0.0;
        } else {
            double taxableAmount = Math.max(0, subtotal - discount);
            if (enableFreeShipping && taxableAmount >= freeShippingThreshold) {
                deliveryCharge = 0.0;
            } else {
                double baseShippingCharge = defaultShippingCharge;
                if (shippingZonesEnabled && req.getShippingAddress() != null && req.getShippingAddress().get("pincode") != null) {
                    String pin = String.valueOf(req.getShippingAddress().get("pincode")).trim();
                    if (pin.length() == 6 && pin.matches("\\d+")) {
                        String zoneName = "North India";
                        if (pin.startsWith("50")) {
                            zoneName = "Telangana";
                        } else if (pin.startsWith("5") || pin.startsWith("6")) {
                            zoneName = "South India";
                        }
                        
                        final String matchedZoneName = zoneName;
                        Optional<Map<String, Object>> matchedZone = zones.stream()
                                .filter(z -> matchedZoneName.equalsIgnoreCase(String.valueOf(z.get("name"))) && "Active".equalsIgnoreCase(String.valueOf(z.get("status"))))
                                .findFirst();
                        if (matchedZone.isPresent()) {
                            Object chargeObj = matchedZone.get().get("charge");
                            if (chargeObj != null) {
                                baseShippingCharge = ((Number) chargeObj).doubleValue();
                            }
                        }
                    }
                }
                deliveryCharge = baseShippingCharge;
            }
        }

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
            order.setOrderStatus("placed");
            order.setPaymentStatus("cash on delivery");
        }

        Order savedOrder = orderRepository.save(order);

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

    @Override
    public Order verifyPayment(UUID userId, PaymentVerifyRequest req) {
        Order order = orderRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElse(null);

        if (order == null) {
            try {
                order = orderRepository.findById(UUID.fromString(req.getRazorpayOrderId())).orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }

        if (order == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found with razorpay order ID: " + req.getRazorpayOrderId());
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

    @Override
    public Order cancelOrder(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String status = order.getOrderStatus().toLowerCase();
        if ("cancelled".equals(status) || "delivered".equals(status) || "shipped".equals(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order in " + status + " status cannot be cancelled.");
        }

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

    @Override
    @Transactional(readOnly = true)
    public List<Order> getUserOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderById(UUID userId, UUID orderId) {
        return orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @Override
    public void processRazorpayWebhook(String eventBody, String signature) {
        boolean valid = paymentService.verifyWebhookSignature(eventBody, signature);
        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook signature");
        }

        try {
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

    @Override
    @Transactional
    public Map<String, Object> createRazorpayOrderForExistingOrder(UUID userId, ExistingOrderPaymentRequest req) {
        UUID orderId = UUID.fromString(req.getOrderId());
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String payStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
        if ("paid".equals(payStatus) || "completed".equals(payStatus)) {
            return Map.of(
                    "success", true,
                    "message", "Order is already paid",
                    "order", order,
                    "razorpay_order_id", order.getRazorpayOrderId() != null ? order.getRazorpayOrderId() : ""
            );
        }

        String ordStatus = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
        if (List.of("cancelled", "refunded", "return_approved", "delivered").contains(ordStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order can no longer be paid online");
        }

        String razorpayOrderId = order.getRazorpayOrderId();
        if (razorpayOrderId == null || razorpayOrderId.trim().isEmpty()) {
            try {
                double totalAmount = order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;
                Map<String, Object> rzpOrder = paymentService.createRazorpayOrder(order.getOrderNumber(), totalAmount);
                razorpayOrderId = String.valueOf(rzpOrder.get("id"));
            } catch (Exception e) {
                log.warn("Failed to create Razorpay order for existing order {}: {}", order.getOrderNumber(), e.getMessage());
                razorpayOrderId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            }
        }

        order.setPaymentMethod("online");
        order.setPaymentStatus("pending");
        order.setRazorpayOrderId(razorpayOrderId);
        order.setUpdatedAt(OffsetDateTime.now());
        Order saved = orderRepository.save(order);

        return Map.of(
                "success", true,
                "message", "Razorpay order created successfully",
                "order", saved,
                "razorpay_order_id", razorpayOrderId
        );
    }

    @Override
    @Transactional
    public Map<String, Object> syncRazorpayPayment(UUID userId, RazorpaySyncRequest req) {
        Optional<Order> orderOpt = Optional.empty();
        if (req.getOrderId() != null && !req.getOrderId().trim().isEmpty()) {
            try {
                orderOpt = orderRepository.findByIdAndUserId(UUID.fromString(req.getOrderId()), userId);
            } catch (IllegalArgumentException ignored) {}
        }
        if (orderOpt.isEmpty() && req.getOrderNumber() != null && !req.getOrderNumber().trim().isEmpty()) {
            orderOpt = orderRepository.findAll().stream()
                    .filter(o -> userId.equals(o.getUserId()) && req.getOrderNumber().equalsIgnoreCase(o.getOrderNumber()))
                    .findFirst();
        }
        if (orderOpt.isEmpty() && req.getRazorpayOrderId() != null && !req.getRazorpayOrderId().trim().isEmpty()) {
            orderOpt = orderRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                    .filter(o -> userId.equals(o.getUserId()));
        }

        if (orderOpt.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }

        Order order = orderOpt.get();

        String payStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
        boolean wasPaid = "paid".equals(payStatus) || "completed".equals(payStatus);

        boolean reconciled = false;
        if (!wasPaid) {
            Map<String, Object> paymentEntity = null;
            if (req.getRazorpayPaymentId() != null && !req.getRazorpayPaymentId().trim().isEmpty()) {
                paymentEntity = paymentService.fetchPayment(req.getRazorpayPaymentId());
            }
            if (paymentEntity == null && order.getRazorpayOrderId() != null) {
                paymentEntity = paymentService.fetchSuccessfulOrderPayment(order.getRazorpayOrderId());
            }

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
                    triggerOrderReceiptEmail(order);
                    reconciled = true;
                }
            }
        }

        return Map.of(
                "success", reconciled || wasPaid,
                "reconciled", reconciled && !wasPaid,
                "payment_status", order.getPaymentStatus(),
                "order_status", order.getOrderStatus(),
                "order_id", order.getId().toString(),
                "order_number", order.getOrderNumber(),
                "razorpay_payment_id", order.getRazorpayPaymentId() != null ? order.getRazorpayPaymentId() : ""
        );
    }
}
