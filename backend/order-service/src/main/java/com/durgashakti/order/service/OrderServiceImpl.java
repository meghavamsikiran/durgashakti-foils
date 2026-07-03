package com.durgashakti.order.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.dto.*;
import com.durgashakti.order.repository.*;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
    private final JdbcTemplate jdbcTemplate;
    private final com.durgashakti.common.util.SupabaseStorageService supabaseStorageService;

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
                            OrderSettingRepository settingRepository,
                            JdbcTemplate jdbcTemplate,
                            com.durgashakti.common.util.SupabaseStorageService supabaseStorageService) {
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
        this.jdbcTemplate = jdbcTemplate;
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostConstruct
    public void migrateOrderPrefixes() {
        try {
            log.info("Running database migration to replace 'DS-' prefix with 'DSF-' in order numbers...");
            int rows = jdbcTemplate.update("UPDATE orders SET order_number = REPLACE(order_number, 'DS-', 'DSF-') WHERE order_number LIKE 'DS-%'");
            log.info("Successfully updated {} order records to 'DSF-' prefix.", rows);
        } catch (Exception e) {
            log.error("Failed to run order number prefix migration: {}", e.getMessage());
        }
    }

    @Override
    public Order createOrder(UUID userId, OrderCreateRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot place order with empty cart");
        }

        String dateStr = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = String.format("%05d", new Random().nextInt(100000));
        String orderNumber = "DSF-" + dateStr + "-" + randomSuffix;

        double subtotal = 0;
        List<Map<String, Object>> verifiedItems = new ArrayList<>();

        for (Map<String, Object> item : req.getItems()) {
            Object pIdObj = item.get("product_id");
            if (pIdObj == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Missing product_id in items");
            UUID productId = UUID.fromString(pIdObj.toString());

            Product product = productRepository.findByIdWithLock(productId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found: " + productId));

            int requestedQty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
            if (product.getStockQuantity() < requestedQty) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Product " + product.getName() + " is out of stock or has insufficient quantity.");
            }

            product.setStockQuantity(product.getStockQuantity() - requestedQty);
            productRepository.save(product);

            double price = product.getPrice() != null ? product.getPrice().doubleValue() : 0.0;
            if (product.getDiscountPrice() != null && product.getDiscountPrice().doubleValue() > 0 
                    && product.getDiscountPrice().doubleValue() < price) {
                price = product.getDiscountPrice().doubleValue();
            }
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
                    discount = Double.parseDouble(String.valueOf(valResult.get("discount_amount")));
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
        boolean codEnabled = true;
        List<Map<String, Object>> zones = new ArrayList<>();

        if (shippingSettingsOpt.isPresent()) {
            Map<String, Object> config = shippingSettingsOpt.get().getValue();
            if (config != null) {
                enableShipping = !Boolean.FALSE.equals(config.get("enableShipping")) && !"Inactive".equalsIgnoreCase(String.valueOf(config.get("shippingRuleStatus")));
                enableFreeShipping = !Boolean.FALSE.equals(config.get("enableFreeShipping"));
                codEnabled = !Boolean.FALSE.equals(config.get("codEnabled")) && !"Inactive".equalsIgnoreCase(String.valueOf(config.get("codStatus")));
                
                if (config.get("freeShippingThreshold") != null) {
                    freeShippingThreshold = Double.parseDouble(String.valueOf(config.get("freeShippingThreshold")));
                }
                if (config.get("defaultShippingCharge") != null) {
                    defaultShippingCharge = Double.parseDouble(String.valueOf(config.get("defaultShippingCharge")));
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
                                baseShippingCharge = Double.parseDouble(String.valueOf(chargeObj));
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

        if ("cod".equalsIgnoreCase(req.getPaymentMethod()) && !codEnabled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cash on Delivery (COD) is temporarily disabled.");
        }

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

        if (!"online".equalsIgnoreCase(savedOrder.getPaymentMethod())) {
            cartRepository.findByUserId(userId).ifPresent(cart -> {
                cart.setItems(new ArrayList<>());
                cart.setUpdatedAt(OffsetDateTime.now());
                cartRepository.save(cart);
            });
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
        
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.setItems(new ArrayList<>());
            cart.setUpdatedAt(OffsetDateTime.now());
            cartRepository.save(cart);
        });
        
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
                int qty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
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
            log.info("Received verified Razorpay Webhook event.");
            JSONObject json = new JSONObject(eventBody);
            String event = json.optString("event");
            
            if ("payment.captured".equals(event) || "order.paid".equals(event)) {
                JSONObject payload = json.optJSONObject("payload");
                if (payload != null) {
                    JSONObject payment = payload.optJSONObject("payment");
                    JSONObject entity = payment != null ? payment.optJSONObject("entity") : null;
                    if (entity != null) {
                        String rzpOrderId = entity.optString("order_id");
                        String paymentId = entity.optString("id");
                        String status = entity.optString("status");
                        
                        if (rzpOrderId != null && !rzpOrderId.isEmpty()) {
                            Order order = orderRepository.findByRazorpayOrderId(rzpOrderId)
                                    .orElse(null);
                            
                            if (order != null) {
                                String payStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
                                boolean isPaid = "paid".equals(payStatus) || "completed".equals(payStatus);
                                
                                if (!isPaid && ("captured".equalsIgnoreCase(status) || "authorized".equalsIgnoreCase(status))) {
                                    order.setPaymentStatus("paid");
                                    order.setOrderStatus("placed");
                                    order.setRazorpayPaymentId(paymentId);
                                    order.setUpdatedAt(OffsetDateTime.now());
                                    orderRepository.save(order);
                                    
                                    cartRepository.findByUserId(order.getUserId()).ifPresent(cart -> {
                                        cart.setItems(new ArrayList<>());
                                        cart.setUpdatedAt(OffsetDateTime.now());
                                        cartRepository.save(cart);
                                    });
                                    
                                    triggerOrderReceiptEmail(order);
                                    log.info("Order {} marked as paid via webhook.", order.getOrderNumber());
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse or process Razorpay webhook body: {}", e.getMessage());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Webhook processing failed: " + e.getMessage());
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
                    
                    cartRepository.findByUserId(order.getUserId()).ifPresent(cart -> {
                        cart.setItems(new ArrayList<>());
                        cart.setUpdatedAt(OffsetDateTime.now());
                        cartRepository.save(cart);
                    });
                    
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

    @Override
    @Transactional
    public Order returnOrder(UUID userId, UUID orderId, String reason, String returnType, String itemsJson, List<MultipartFile> images) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String currentOrderStatus = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "";
        if (!"delivered".equals(currentOrderStatus) && !"return_requested".equals(currentOrderStatus) && !"return_approved".equals(currentOrderStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only delivered orders can be returned");
        }

        if ("cod".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Returns are not allowed for Cash on Delivery (COD) orders.");
        }

        // Return window checking (3 days)
        OffsetDateTime deliveredDate = order.getDeliveredAt() != null ? order.getDeliveredAt() : order.getUpdatedAt();
        if (deliveredDate != null) {
            OffsetDateTime cutoff = deliveredDate.plusDays(3).truncatedTo(ChronoUnit.DAYS);
            if (OffsetDateTime.now().isAfter(cutoff)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Return window has closed.");
            }
        }

        List<Map<String, Object>> returningItemsList = new ArrayList<>();
        if (itemsJson != null && !itemsJson.trim().isEmpty()) {
            try {
                returningItemsList = new ObjectMapper().readValue(itemsJson, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid items format");
            }
        } else {
            // Fallback to returning all items
            for (Map<String, Object> item : order.getItems()) {
                Map<String, Object> ri = new HashMap<>();
                ri.put("product_id", item.get("product_id"));
                ri.put("quantity", item.getOrDefault("quantity", 1));
                returningItemsList.add(ri);
            }
        }

        List<String> uploadedUrls = new ArrayList<>();
        if (images != null) {
            for (MultipartFile file : images) {
                if (file.isEmpty()) continue;
                String contentType = file.getContentType();
                boolean isImage = contentType != null && contentType.startsWith("image/");
                if (!isImage) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Only image files are allowed for return proofs");
                }
                if (file.getSize() > 2 * 1024 * 1024) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Each image must be under 2MB");
                }
                try {
                    String fileUrl = supabaseStorageService.uploadFile(file, "returns");
                    uploadedUrls.add(fileUrl);
                } catch (Exception e) {
                    log.error("Failed to upload return image proof to Supabase", e);
                }
            }
        }

        Map<String, Object> metadata = new HashMap<>();
        if (order.getShippingAddress() != null && order.getShippingAddress().get("shipping_metadata") instanceof Map) {
            metadata = (Map<String, Object>) order.getShippingAddress().get("shipping_metadata");
        }
        double originalSubtotal = metadata.get("subtotal") != null ? Double.parseDouble(String.valueOf(metadata.get("subtotal"))) : order.getTotalAmount().doubleValue();
        double originalDiscount = metadata.get("discount_amount") != null ? Double.parseDouble(String.valueOf(metadata.get("discount_amount"))) : 0.0;

        List<Map<String, Object>> updatedItems = new ArrayList<>();
        boolean anyUpdated = false;

        for (Map<String, Object> item : order.getItems()) {
            Map<String, Object> matched = null;
            for (Map<String, Object> ri : returningItemsList) {
                if (String.valueOf(ri.get("product_id")).equals(String.valueOf(item.get("product_id")))) {
                    matched = ri;
                    break;
                }
            }

            if (matched != null) {
                int retQty = (int) Double.parseDouble(String.valueOf(matched.getOrDefault("quantity", item.getOrDefault("quantity", 1))));
                int originalQty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
                if (retQty <= 0 || retQty > originalQty) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid return quantity for " + item.get("product_name"));
                }

                item.put("return_type", returnType);
                String statusVal = "exchange".equalsIgnoreCase(returnType) ? "EXCHANGE_REQUESTED" : "RETURN_REQUESTED";
                item.put("return_status", statusVal);
                item.put("returned_quantity", retQty);
                item.put("return_reason", reason);
                item.put("return_proof_images", uploadedUrls);

                List<Map<String, Object>> auditTimeline = new ArrayList<>();
                Map<String, Object> audit = new HashMap<>();
                audit.put("status", statusVal);
                audit.put("timestamp", OffsetDateTime.now().toString());
                audit.put("remarks", ("exchange".equalsIgnoreCase(returnType) ? "Exchange" : "Return") + " requested for qty " + retQty + ". Reason: " + reason);
                auditTimeline.add(audit);
                item.put("audit_timeline", auditTimeline);

                double price = Double.parseDouble(String.valueOf(item.getOrDefault("price", 0.0)));
                double returnedItemSubtotal = price * retQty;
                double couponDiscountShare = 0.0;
                if (originalSubtotal > 0) {
                    couponDiscountShare = Math.round((returnedItemSubtotal / originalSubtotal) * originalDiscount * 100.0) / 100.0;
                }
                couponDiscountShare = Math.min(couponDiscountShare, returnedItemSubtotal);

                double taxableAmount = Math.round(Math.max(0.0, returnedItemSubtotal - couponDiscountShare) * 100.0) / 100.0;
                double cgstAmount = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
                double sgstAmount = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
                double refundableAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100.0) / 100.0;

                Map<String, Object> refundCalculations = new HashMap<>();
                refundCalculations.put("taxable_amount", taxableAmount);
                refundCalculations.put("cgst_amount", cgstAmount);
                refundCalculations.put("sgst_amount", sgstAmount);
                refundCalculations.put("coupon_discount_share", couponDiscountShare);
                refundCalculations.put("refundable_amount", refundableAmount);
                refundCalculations.put("shipping_reimbursement", 0.0);
                item.put("refund_calculations", refundCalculations);

                anyUpdated = true;
            }
            updatedItems.add(item);
        }

        if (!anyUpdated) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No valid items selected for return");
        }

        order.setItems(updatedItems);
        order.setOrderStatus("return_requested");
        order.setReturnReason(reason);
        order.setReturnImageUrl(!uploadedUrls.isEmpty() ? String.join(",", uploadedUrls) : null);
        order.setUpdatedAt(OffsetDateTime.now());

        Order saved = orderRepository.save(order);

        // Send return requested email!
        try {
            userRepository.findById(saved.getUserId()).ifPresent(user -> {
                String subject = "Return Request Received - " + saved.getOrderNumber();
                String body = "Dear " + user.getFullName() + ",\n\n" +
                        "We have received your return request for Order Number: " + saved.getOrderNumber() + ".\n" +
                        "Reason: " + reason + "\n\n" +
                        "Our support team is reviewing your request and proof media. We will update you shortly.\n\n" +
                        "Best regards,\nDurga Shakti Foils Team";
                emailClient.sendEmail(user.getEmail(), subject, body);
            });
        } catch (Exception e) {
            log.error("Failed to send return request email", e);
        }

        return saved;
    }

    @Override
    @Transactional
    public Order selfShipItem(UUID userId, UUID orderId, UUID productId, String courierName, String trackingNumber, String trackingUrl, Double courierCost, String notes, MultipartFile invoice) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        List<Map<String, Object>> updatedItems = new ArrayList<>();
        boolean foundItem = false;

        for (Map<String, Object> item : order.getItems()) {
            if (String.valueOf(item.get("product_id")).equals(productId.toString())) {
                foundItem = true;
                String currentStatus = String.valueOf(item.get("return_status"));
                if (!"RETURN_APPROVED".equalsIgnoreCase(currentStatus) && !"return_approved".equalsIgnoreCase(currentStatus) && !"EXCHANGE_APPROVED".equalsIgnoreCase(currentStatus)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Item is not approved for return or exchange");
                }

                List<Map<String, Object>> validationTimeline = (List<Map<String, Object>>) item.get("audit_timeline");
                OffsetDateTime approvedAt = null;
                if (validationTimeline != null) {
                    for (Map<String, Object> entry : validationTimeline) {
                        String st = String.valueOf(entry.get("status"));
                        if ("RETURN_APPROVED".equalsIgnoreCase(st) || "EXCHANGE_APPROVED".equalsIgnoreCase(st)) {
                            Object tsVal = entry.get("timestamp");
                            if (tsVal != null) {
                                try {
                                    approvedAt = OffsetDateTime.parse(tsVal.toString());
                                } catch (Exception e) {
                                    log.warn("Failed to parse timeline timestamp: {}", tsVal);
                                }
                            }
                        }
                    }
                }
                if (approvedAt == null) {
                    approvedAt = order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt();
                }

                if (approvedAt != null) {
                    long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(approvedAt, OffsetDateTime.now());
                    if (daysDiff > 3) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Self-shipping deadline has expired (3 days max limit from approval). Refund/exchange cannot be processed.");
                    }
                }

                String invoiceUrl = null;
                if (invoice != null && !invoice.isEmpty()) {
                    String contentType = invoice.getContentType();
                    boolean isImage = contentType != null && contentType.startsWith("image/");
                    boolean isPdf = contentType != null && contentType.contains("pdf");
                    if (!isImage && !isPdf) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Only images and PDF files are allowed for invoices");
                    }
                    if (invoice.getSize() > 2 * 1024 * 1024) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Invoice file must be under 2MB");
                    }
                    try {
                        invoiceUrl = supabaseStorageService.uploadFile(invoice, "returns");
                    } catch (Exception e) {
                        log.error("Failed to upload self ship invoice to Supabase", e);
                    }
                }

                item.put("return_status", "SELF_SHIPPED");

                Map<String, Object> selfShippingDetails = new HashMap<>();
                selfShippingDetails.put("courier_name", courierName);
                selfShippingDetails.put("tracking_number", trackingNumber);
                selfShippingDetails.put("tracking_url", trackingUrl);
                selfShippingDetails.put("courier_invoice_url", invoiceUrl);
                selfShippingDetails.put("courier_cost", courierCost != null ? courierCost : 0.0);
                selfShippingDetails.put("notes", notes);
                item.put("self_shipping_details", selfShippingDetails);

                List<Map<String, Object>> auditTimeline = (List<Map<String, Object>>) item.get("audit_timeline");
                if (auditTimeline == null) {
                    auditTimeline = new ArrayList<>();
                }
                Map<String, Object> audit = new HashMap<>();
                audit.put("status", "SELF_SHIPPED");
                audit.put("timestamp", OffsetDateTime.now().toString());
                audit.put("remarks", "Item self-shipped via " + courierName + ". Tracking number: " + trackingNumber);
                auditTimeline.add(audit);
                item.put("audit_timeline", auditTimeline);
            }
            updatedItems.add(item);
        }

        if (!foundItem) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Product not found in this order");
        }

        order.setItems(updatedItems);
        order.setUpdatedAt(OffsetDateTime.now());

        return orderRepository.save(order);
    }
}
