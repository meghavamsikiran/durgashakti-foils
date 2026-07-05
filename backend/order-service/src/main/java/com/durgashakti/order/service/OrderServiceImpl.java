package com.durgashakti.order.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.common.service.InvoiceService;
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
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronization;

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
    private final InvoiceService invoiceService;

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
                            com.durgashakti.common.util.SupabaseStorageService supabaseStorageService,
                            InvoiceService invoiceService) {
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
        this.invoiceService = invoiceService;
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
                            couponRepository.findByCodeIgnoreCaseWithLock(codeStr).ifPresent(usedCoupons::add);
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

        double taxableAmount = Math.max(0, subtotal - discount);
        double cgst = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
        double sgst = Math.round(taxableAmount * 0.09 * 100.0) / 100.0;
        
        double codCharge = 0.0;
        if ("cod".equalsIgnoreCase(req.getPaymentMethod())) {
            double defaultCodCharge = 20.0;
            if (shippingSettingsOpt.isPresent()) {
                Map<String, Object> config = shippingSettingsOpt.get().getValue();
                if (config != null) {
                    if (config.get("codCharge") != null) {
                        defaultCodCharge = Double.parseDouble(String.valueOf(config.get("codCharge")));
                    } else if (config.get("cod_extra_service_charge") != null) {
                        defaultCodCharge = Double.parseDouble(String.valueOf(config.get("cod_extra_service_charge")));
                    }
                }
            }
            codCharge = defaultCodCharge;
        }

        double total = Math.round((taxableAmount + deliveryCharge + cgst + sgst + codCharge) * 100.0) / 100.0;

        Map<String, Object> enrichedAddress = new HashMap<>();
        if (req.getShippingAddress() != null) {
            enrichedAddress.putAll(req.getShippingAddress());
        }
        Map<String, Object> shippingMetadata = new HashMap<>();
        shippingMetadata.put("subtotal", subtotal);
        shippingMetadata.put("discount_amount", discount);
        shippingMetadata.put("shipping_cost", deliveryCharge);
        shippingMetadata.put("cgst_amount", cgst);
        shippingMetadata.put("sgst_amount", sgst);
        shippingMetadata.put("cod_charge", codCharge);
        enrichedAddress.put("shipping_metadata", shippingMetadata);

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUserId(userId);
        order.setItems(verifiedItems);
        order.setTotalAmount(BigDecimal.valueOf(total));
        order.setDiscountAmount(BigDecimal.valueOf(discount));
        order.setShippingAddress(enrichedAddress);
        order.setPaymentMethod(req.getPaymentMethod());
        order.setCouponCodes(req.getCouponCodes());
        order.setTrackingEventsJson(new ArrayList<>());

        String customerName = "Guest User";
        Optional<com.durgashakti.common.entity.User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            customerName = userOpt.get().getFullName();
        } else if (req.getShippingAddress() != null) {
            if (req.getShippingAddress().get("full_name") != null) {
                customerName = String.valueOf(req.getShippingAddress().get("full_name")).trim();
            } else if (req.getShippingAddress().get("fullName") != null) {
                customerName = String.valueOf(req.getShippingAddress().get("fullName")).trim();
            }
        }
        order.setCustomerName(customerName);

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
        Order order = orderRepository.findByRazorpayOrderIdWithLock(req.getRazorpayOrderId())
                .orElse(null);

        if (order == null) {
            try {
                order = orderRepository.findByIdWithLock(UUID.fromString(req.getRazorpayOrderId())).orElse(null);
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
        order.setOrderStatus("confirmed");
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
                productRepository.findByIdWithLock(productId).ifPresent(p -> {
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
    @Transactional
    public Order getOrderById(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        boolean changed = syncPendingRefunds(order);
        if (changed) {
            order = orderRepository.save(order);
        }
        return order;
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
                            Order order = orderRepository.findByRazorpayOrderIdWithLock(rzpOrderId)
                                    .orElse(null);
                            
                            if (order != null) {
                                String payStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
                                boolean isPaid = "paid".equals(payStatus) || "completed".equals(payStatus);
                                
                                if (!isPaid && ("captured".equalsIgnoreCase(status) || "authorized".equalsIgnoreCase(status))) {
                                    order.setPaymentStatus("paid");
                                    order.setOrderStatus("confirmed");
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
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendOrderReceiptEmailAsync(order);
                }
            });
        } else {
            sendOrderReceiptEmailAsync(order);
        }
    }

    private void sendOrderReceiptEmailAsync(Order order) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                userRepository.findById(order.getUserId()).ifPresent(user -> {
                    String subject = "Order Placed Successfully - " + order.getOrderNumber();
                    
                    // Build premium HTML items table
                    StringBuilder itemsHtml = new StringBuilder();
                    itemsHtml.append("<table width=\"100%\" cellpadding=\"10\" cellspacing=\"0\" style=\"border-collapse:collapse;margin:20px 0;\">");
                    itemsHtml.append("<thead><tr style=\"background:#f8fafc;border-bottom:2px solid #e2e8f0;\">");
                    itemsHtml.append("<th align=\"left\" style=\"font-size:12px;color:#475569;text-transform:uppercase;font-weight:700;width:60px;\">Image</th>");
                    itemsHtml.append("<th align=\"left\" style=\"font-size:12px;color:#475569;text-transform:uppercase;font-weight:700;\">Item</th>");
                    itemsHtml.append("<th align=\"center\" style=\"font-size:12px;color:#475569;text-transform:uppercase;font-weight:700;\">Qty</th>");
                    itemsHtml.append("<th align=\"right\" style=\"font-size:12px;color:#475569;text-transform:uppercase;font-weight:700;\">Price</th>");
                    itemsHtml.append("<th align=\"right\" style=\"font-size:12px;color:#475569;text-transform:uppercase;font-weight:700;\">Total</th>");
                    itemsHtml.append("</tr></thead><tbody>");
                    
                    if (order.getItems() != null) {
                        for (Map<String, Object> item : order.getItems()) {
                            String name = String.valueOf(item.getOrDefault("product_name", "Product"));
                            String size = item.get("selectedSize") != null ? " (" + item.get("selectedSize") + ")" : "";
                            int qty = 1;
                            try {
                                qty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
                            } catch (Exception ignored) {}
                            double price = 0.0;
                            try {
                                price = Double.parseDouble(String.valueOf(item.getOrDefault("price", 0.0)));
                            } catch (Exception ignored) {}
                            double total = price * qty;
                            
                            String rawImg = String.valueOf(item.get("image_url"));
                            String imageUrl = "https://durgashakti-foils.vercel.app/logo-durga.png";
                            if (rawImg != null && !rawImg.trim().isEmpty() && !"null".equalsIgnoreCase(rawImg)) {
                                if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) {
                                    imageUrl = rawImg;
                                } else {
                                    String cleanImg = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
                                    if (cleanImg.startsWith("/uploads/")) {
                                        imageUrl = "https://durgashakti-foils-2.onrender.com" + cleanImg;
                                    } else {
                                        imageUrl = "https://durgashakti-foils.vercel.app" + cleanImg;
                                    }
                                }
                            }

                            double itemCgst = total * 0.09;
                            double itemSgst = total * 0.09;

                            itemsHtml.append("<tr style=\"border-bottom:1px solid #f1f5f9;\">");
                            itemsHtml.append("<td style=\"padding:10px;\"><img src=\"").append(imageUrl).append("\" width=\"40\" height=\"40\" style=\"border-radius:6px;object-fit:cover;display:block;\" alt=\"Product\" /></td>");
                            itemsHtml.append("<td style=\"font-size:14px;color:#1e293b;\">")
                                     .append(name).append(size)
                                     .append("<br/><span style=\"font-size:10px;color:#64748b;\">CGST (9%): Rs. ").append(String.format("%.2f", itemCgst))
                                     .append(" | SGST (9%): Rs. ").append(String.format("%.2f", itemSgst)).append("</span></td>");
                            itemsHtml.append("<td align=\"center\" style=\"font-size:14px;color:#1e293b;\">").append(qty).append("</td>");
                            itemsHtml.append("<td align=\"right\" style=\"font-size:14px;color:#1e293b;\">Rs. ").append(String.format("%.2f", price)).append("</td>");
                            itemsHtml.append("<td align=\"right\" style=\"font-size:14px;color:#1e293b;font-weight:600;\">Rs. ").append(String.format("%.2f", total + itemCgst + itemSgst)).append("</td>");
                            itemsHtml.append("</tr>");
                        }
                    }
                    itemsHtml.append("</tbody></table>");
                    
                    // Calculate CGST and SGST and Shipping Costs
                    double subtotal = 0.0;
                    double discountVal = order.getDiscountAmount() != null ? order.getDiscountAmount().doubleValue() : 0.0;
                    double cgst = 0.0;
                    double sgst = 0.0;
                    double shippingCost = 0.0;
                    double codCharge = 0.0;
                    double grandTotal = order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;

                    Map<String, Object> metadata = null;
                    if (order.getShippingAddress() != null && order.getShippingAddress().get("shipping_metadata") instanceof Map) {
                        metadata = (Map<String, Object>) order.getShippingAddress().get("shipping_metadata");
                    }

                    if (metadata != null) {
                        subtotal = metadata.get("subtotal") != null ? Double.parseDouble(String.valueOf(metadata.get("subtotal"))) : 0.0;
                        cgst = metadata.get("cgst_amount") != null ? Double.parseDouble(String.valueOf(metadata.get("cgst_amount"))) : 0.0;
                        sgst = metadata.get("sgst_amount") != null ? Double.parseDouble(String.valueOf(metadata.get("sgst_amount"))) : 0.0;
                        shippingCost = metadata.get("shipping_cost") != null ? Double.parseDouble(String.valueOf(metadata.get("shipping_cost"))) : 0.0;
                        codCharge = metadata.get("cod_charge") != null ? Double.parseDouble(String.valueOf(metadata.get("cod_charge"))) : 0.0;
                    } else {
                        if (order.getItems() != null) {
                            for (Map<String, Object> item : order.getItems()) {
                                double price = 0.0;
                                try {
                                    price = Double.parseDouble(String.valueOf(item.getOrDefault("price", 0.0)));
                                } catch (Exception ignored) {}
                                int qty = 1;
                                try {
                                    qty = (int) Double.parseDouble(String.valueOf(item.getOrDefault("quantity", 1)));
                                } catch (Exception ignored) {}
                                subtotal += price * qty;
                            }
                        }
                        double taxableTotal = Math.max(0.0, subtotal - discountVal);
                        cgst = Math.round(taxableTotal * 0.09 * 100.0) / 100.0;
                        sgst = Math.round(taxableTotal * 0.09 * 100.0) / 100.0;
                        double remaining = Math.max(0.0, Math.round((grandTotal - (taxableTotal + cgst + sgst)) * 100.0) / 100.0);
                        if (remaining > 0) {
                            if ("cod".equalsIgnoreCase(order.getPaymentMethod())) {
                                if (remaining >= 20.0) {
                                    codCharge = 20.0;
                                    shippingCost = remaining - 20.0;
                                } else {
                                    codCharge = remaining;
                                    shippingCost = 0.0;
                                }
                            } else {
                                shippingCost = remaining;
                            }
                        }
                    }

                    // Shipping Address Formatter
                    String addressStr = "";
                    if (order.getShippingAddress() != null) {
                        Map<String, Object> addr = order.getShippingAddress();
                        addressStr = String.format("%s, %s, %s, %s - %s",
                            addr.getOrDefault("address_line1", addr.getOrDefault("addressLine1", "")),
                            addr.getOrDefault("city", ""),
                            addr.getOrDefault("state", ""),
                            addr.getOrDefault("country", "India"),
                            addr.getOrDefault("pincode", "")
                        );
                    }
                    
                    String htmlBody = "<!DOCTYPE html>\n" +
                            "<html>\n" +
                            "<head>\n" +
                            "    <meta charset=\"UTF-8\">\n" +
                            "    <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n" +
                            "    <title>" + subject + "</title>\n" +
                            "</head>\n" +
                            "<body style=\"margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;\">\n" +
                            "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:30px 0;\">\n" +
                            "<tr><td align=\"center\">\n" +
                            "<table width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);\">\n" +
                            "  <!-- Header -->\n" +
                            "  <tr><td style=\"background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;\">\n" +
                            "    <img src=\"https://durgashakti-foils.vercel.app/logo-durga.png\" width=\"280\" style=\"margin:0 auto;object-fit:contain;display:block;\" alt=\"DurgaShakti Foils Logo\">\n" +
                            "  </td></tr>\n" +
                            "  <!-- Body -->\n" +
                            "  <tr><td style=\"padding:36px 40px;color:#374151;font-size:14px;line-height:1.6;\">\n" +
                            "    <h2 style=\"margin:0 0 16px;color:#ea580c;font-size:20px;font-weight:700;\">Order Placed Successfully!</h2>\n" +
                            "    <p style=\"margin:0 0 20px;color:#4b5563;\">Dear " + user.getFullName() + ", thank you for shopping with Durga Shakti Foils. Your order has been registered and is currently being processed.</p>\n" +
                            "    \n" +
                            "    <div style=\"background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;\">\n" +
                            "        <p style=\"margin:0;font-size:13px;color:#64748b;\">Order Number</p>\n" +
                            "        <p style=\"margin:2px 0 10px;font-size:16px;font-weight:700;color:#0f172a;\">#" + order.getOrderNumber() + "</p>\n" +
                            "        <p style=\"margin:0;font-size:13px;color:#64748b;\">Payment Method</p>\n" +
                            "        <p style=\"margin:2px 0 0;font-size:14px;font-weight:600;color:#0f172a;text-transform:uppercase;\">" + order.getPaymentMethod() + "</p>\n" +
                            "    </div>\n" +
                            "    \n" +
                            "    <h3 style=\"margin:20px 0 10px;color:#0f172a;font-size:16px;font-weight:600;\">Items Ordered</h3>\n" +
                            "    " + itemsHtml.toString() + "\n" +
                            "    \n" +
                            "    <div style=\"border-top:1px solid #e2e8f0;padding-top:16px;margin-bottom:20px;\">\n" +
                            "        <table width=\"100%\" cellpadding=\"4\" cellspacing=\"0\">\n" +
                            "            <tr><td style=\"color:#64748b;\">Subtotal</td><td align=\"right\" style=\"color:#0f172a;\">Rs. " + String.format("%.2f", subtotal) + "</td></tr>\n" +
                            "            <tr><td style=\"color:#64748b;\">CGST (9%)</td><td align=\"right\" style=\"color:#0f172a;\">Rs. " + String.format("%.2f", cgst) + "</td></tr>\n" +
                            "            <tr><td style=\"color:#64748b;\">SGST (9%)</td><td align=\"right\" style=\"color:#0f172a;\">Rs. " + String.format("%.2f", sgst) + "</td></tr>\n" +
                            "            <tr><td style=\"color:#64748b;\">Shipping Cost</td><td align=\"right\" style=\"color:#0f172a;\">" + (shippingCost > 0 ? "Rs. " + String.format("%.2f", shippingCost) : "FREE") + "</td></tr>\n" +
                            "            " + (codCharge > 0 ? "<tr><td style=\"color:#64748b;\">COD Handling Fee</td><td align=\"right\" style=\"color:#0f172a;\">Rs. " + String.format("%.2f", codCharge) + "</td></tr>\n" : "") +
                            "            " + (discountVal > 0 ? "<tr><td style=\"color:#64748b;\">Coupon Discount</td><td align=\"right\" style=\"color:#16a34a;\">- Rs. " + String.format("%.2f", discountVal) + "</td></tr>\n" : "") +
                            "            <tr><td style=\"color:#64748b;font-weight:700;font-size:16px;\">Total Amount Paid</td><td align=\"right\" style=\"color:#ea580c;font-weight:700;font-size:18px;\">Rs. " + order.getTotalAmount() + "</td></tr>\n" +
                            "        </table>\n" +
                            "    </div>\n" +
                            "    \n" +
                            "    <div style=\"background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:28px;\">\n" +
                            "        <p style=\"margin:0;font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;\">Delivery Address</p>\n" +
                            "        <p style=\"margin:6px 0 0;color:#334155;font-size:14px;\">" + addressStr + "</p>\n" +
                            "    </div>\n" +
                            "    \n" +
                            "    <div style=\"text-align:center;margin:30px 0;\">\n" +
                            "        <a href=\"https://durgashakti-foils.vercel.app/order/" + order.getId() + "\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:700;border-radius:8px;display:inline-block;font-size:14px;box-shadow:0 4px 12px rgba(234,88,12,0.25);\">View Order Details</a>\n" +
                            "    </div>\n" +
                            "  </td></tr>\n" +
                            "  <!-- Footer -->\n" +
                            "  <tr><td style=\"background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;\">\n" +
                            "    <p style=\"margin:0;color:#6b7280;font-size:12px;\">© " + java.time.Year.now().getValue() + " DurgaShakti Foils. All rights reserved.</p>\n" +
                            "    <p style=\"margin:6px 0 0;color:#6b7280;font-size:12px;\">\n" +
                            "      <a href=\"https://durgashakti-foils.vercel.app\" style=\"color:#ea580c;text-decoration:none;font-weight:600;\">Visit our website</a> &nbsp;|&nbsp;\n" +
                            "      <a href=\"https://durgashakti-foils.vercel.app/contact\" style=\"color:#ea580c;text-decoration:none;font-weight:600;\">Contact Support</a>\n" +
                            "    </p>\n" +
                            "  </td></tr>\n" +
                            "</table>\n" +
                            "</td></tr>\n" +
                            "</table>\n" +
                            "</body>\n" +
                            "</html>";
                    
                    byte[] pdfBytes = null;
                    String attachmentName = null;
                    try {
                        pdfBytes = invoiceService.generateInvoicePdf(order);
                        if (pdfBytes != null && pdfBytes.length > 0) {
                            attachmentName = "Tax_Invoice_" + order.getOrderNumber() + ".pdf";
                            log.info("Invoice PDF generated successfully for order {}: {} bytes", order.getOrderNumber(), pdfBytes.length);
                        } else {
                            log.warn("Invoice PDF generation returned empty bytes for order {}", order.getOrderNumber());
                            pdfBytes = null;
                        }
                    } catch (Exception pdfEx) {
                        log.error("Failed to generate invoice PDF for order {}: {}", order.getOrderNumber(), pdfEx.getMessage(), pdfEx);
                    }
                    if (pdfBytes != null && attachmentName != null) {
                        emailClient.sendEmail(user.getEmail(), subject, htmlBody, pdfBytes, attachmentName);
                    } else {
                        emailClient.sendEmail(user.getEmail(), subject, htmlBody);
                    }
                    order.setReceiptEmailSent(true);
                    orderRepository.save(order);
                });
            } catch (Exception e) {
                log.error("Failed to send order placement email for {}: {}", order.getOrderNumber(), e.getMessage());
            }
        });
    }

    @Override
    @Transactional
    public Map<String, Object> createRazorpayOrderForExistingOrder(UUID userId, ExistingOrderPaymentRequest req) {
        UUID orderId = UUID.fromString(req.getOrderId());
        Order order = orderRepository.findByIdWithLock(orderId)
                .filter(o -> userId.equals(o.getUserId()))
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
                java.util.concurrent.CompletableFuture.runAsync(() -> {
                    try {
                        String subject = "Return Request Received - " + saved.getOrderNumber();
                        
                        StringBuilder itemsHtml = new StringBuilder();
                        itemsHtml.append("<table width=\"100%\" cellpadding=\"8\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid #e2e8f0;color:#334155;\">");
                        itemsHtml.append("<thead style=\"background-color:#f8fafc;\">");
                        itemsHtml.append("<tr>");
                        itemsHtml.append("<th align=\"left\" style=\"border-bottom:2px solid #e2e8f0;padding:8px;font-weight:700;\">Item</th>");
                        itemsHtml.append("<th align=\"center\" style=\"border-bottom:2px solid #e2e8f0;padding:8px;font-weight:700;\">Qty</th>");
                        itemsHtml.append("<th align=\"right\" style=\"border-bottom:2px solid #e2e8f0;padding:8px;font-weight:700;\">Price</th>");
                        itemsHtml.append("<th align=\"right\" style=\"border-bottom:2px solid #e2e8f0;padding:8px;font-weight:700;\">Tax (GST 18%)</th>");
                        itemsHtml.append("<th align=\"right\" style=\"border-bottom:2px solid #e2e8f0;padding:8px;font-weight:700;\">Total</th>");
                        itemsHtml.append("</tr>");
                        itemsHtml.append("</thead>");
                        itemsHtml.append("<tbody>");

                        double totalRefundable = 0.0;
                        for (Map<String, Object> item : saved.getItems()) {
                            String rStatus = String.valueOf(item.get("return_status"));
                            if ("RETURN_REQUESTED".equalsIgnoreCase(rStatus) || "EXCHANGE_REQUESTED".equalsIgnoreCase(rStatus)) {
                                String name = String.valueOf(item.getOrDefault("product_name", "Product"));
                                String size = item.get("selectedSize") != null ? " (" + item.get("selectedSize") + ")" : "";
                                int retQty = ((Number) item.getOrDefault("returned_quantity", 1)).intValue();
                                double price = ((Number) item.getOrDefault("price", 0.0)).doubleValue();
                                
                                double itemTotal = price * retQty;
                                double itemCgst = Math.round(itemTotal * 0.09 * 100.0) / 100.0;
                                double itemSgst = Math.round(itemTotal * 0.09 * 100.0) / 100.0;
                                double itemGst = itemCgst + itemSgst;
                                double itemTotalWithTax = itemTotal + itemGst;
                                totalRefundable += itemTotalWithTax;
                                
                                String rawImg = String.valueOf(item.get("image_url"));
                                String imageUrl = "https://durgashakti-foils.vercel.app/logo-durga.png";
                                if (rawImg != null && !rawImg.trim().isEmpty() && !"null".equalsIgnoreCase(rawImg)) {
                                    if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) {
                                        imageUrl = rawImg;
                                    } else {
                                        String cleanImg = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
                                        imageUrl = "https://durgashakti-foils.vercel.app" + cleanImg;
                                    }
                                }
                                
                                itemsHtml.append("<tr>");
                                itemsHtml.append("<td style=\"border-bottom:1px solid #e2e8f0;padding:8px;\">");
                                itemsHtml.append("<table cellpadding=\"0\" cellspacing=\"0\"><tr>");
                                itemsHtml.append("<td><img src=\"").append(imageUrl).append("\" width=\"36\" height=\"36\" style=\"border-radius:6px;object-fit:cover;margin-right:8px;display:block;\" /></td>");
                                itemsHtml.append("<td style=\"font-size:13px;color:#0f172a;font-weight:600;\">").append(name).append(size).append("<br/><span style=\"font-size:10px;color:#64748b;font-weight:normal;\">CGST (9%): Rs. ").append(String.format("%.2f", itemCgst)).append(" | SGST (9%): Rs. ").append(String.format("%.2f", itemSgst)).append("</span></td>");
                                itemsHtml.append("</tr></table>");
                                itemsHtml.append("</td>");
                                itemsHtml.append("<td align=\"center\" style=\"border-bottom:1px solid #e2e8f0;padding:8px;\">").append(retQty).append("</td>");
                                itemsHtml.append("<td align=\"right\" style=\"border-bottom:1px solid #e2e8f0;padding:8px;\">Rs. ").append(String.format("%.2f", price)).append("</td>");
                                itemsHtml.append("<td align=\"right\" style=\"border-bottom:1px solid #e2e8f0;padding:8px;\">Rs. ").append(String.format("%.2f", itemGst)).append("</td>");
                                itemsHtml.append("<td align=\"right\" style=\"border-bottom:1px solid #e2e8f0;padding:8px;font-weight:600;color:#0f172a;\">Rs. ").append(String.format("%.2f", itemTotalWithTax)).append("</td>");
                                itemsHtml.append("</tr>");
                            }
                        }
                        itemsHtml.append("</tbody></table>");

                        String htmlBody = "<!DOCTYPE html>\n" +
                                "<html>\n" +
                                "<head>\n" +
                                "    <meta charset=\"UTF-8\">\n" +
                                "    <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n" +
                                "    <title>" + subject + "</title>\n" +
                                "</head>\n" +
                                "<body style=\"margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;\">\n" +
                                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:30px 0;\">\n" +
                                "<tr><td align=\"center\">\n" +
                                "<table width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);\">\n" +
                                "  <!-- Header -->\n" +
                                "  <tr><td style=\"background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;\">\n" +
                                "    <img src=\"https://durgashakti-foils.vercel.app/logo-durga.png\" width=\"280\" style=\"margin:0 auto;object-fit:contain;display:block;\" alt=\"DurgaShakti Foils Logo\">\n" +
                                "  </td></tr>\n" +
                                "  <!-- Body -->\n" +
                                "  <tr><td style=\"padding:36px 40px;color:#374151;font-size:14px;line-height:1.6;\">\n" +
                                "    <h2 style=\"margin:0 0 16px;color:#ea580c;font-size:20px;font-weight:700;\">Return Request Received</h2>\n" +
                                "    <p style=\"margin:0 0 20px;color:#4b5563;\">Dear " + user.getFullName() + ", we have received your request to return/exchange items from order <strong>#" + saved.getOrderNumber() + "</strong>. Our support team is currently reviewing your request and details.</p>\n" +
                                "    \n" +
                                "    <div style=\"background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;\">\n" +
                                "        <p style=\"margin:0;font-size:13px;color:#64748b;\">Reason for Return</p>\n" +
                                "        <p style=\"margin:2px 0 0;font-size:14px;font-weight:700;color:#0f172a;\">" + reason + "</p>\n" +
                                "    </div>\n" +
                                "    \n" +
                                "    <h3 style=\"margin:20px 0 10px;color:#0f172a;font-size:16px;font-weight:600;\">Items Requested for Return</h3>\n" +
                                "    " + itemsHtml.toString() + "\n" +
                                "    \n" +
                                "    <div style=\"border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px;margin-bottom:20px;\">\n" +
                                "        <table width=\"100%\" cellpadding=\"4\" cellspacing=\"0\">\n" +
                                "            <tr><td style=\"color:#64748b;font-weight:700;font-size:15px;\">Est. Refundable Amount</td><td align=\"right\" style=\"color:#ea580c;font-weight:700;font-size:16px;\">Rs. " + String.format("%.2f", totalRefundable) + "</td></tr>\n" +
                                "        </table>\n" +
                                "    </div>\n" +
                                "    \n" +
                                "    <div style=\"text-align:center;margin:30px 0;\">\n" +
                                "        <a href=\"https://durgashakti-foils.vercel.app/order/" + saved.getId() + "\" style=\"background:#ea580c;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:700;border-radius:8px;display:inline-block;font-size:14px;box-shadow:0 4px 12px rgba(234,88,12,0.25);\">View Order Details</a>\n" +
                                "    </div>\n" +
                                "  </td></tr>\n" +
                                "  <!-- Footer -->\n" +
                                "  <tr><td style=\"background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;\">\n" +
                                "    <p style=\"margin:0;color:#6b7280;font-size:12px;\">© " + java.time.Year.now().getValue() + " DurgaShakti Foils. All rights reserved.</p>\n" +
                                "  </td></tr>\n" +
                                "</table>\n" +
                                "</td></tr>\n" +
                                "</table>\n" +
                                "</body>\n" +
                                "</html>";
                                
                        emailClient.sendEmail(user.getEmail(), subject, htmlBody);
                    } catch (Exception e) {
                        log.error("Failed to send return request email", e);
                    }
                });
            });
        } catch (Exception e) {
            log.error("Failed to initiate return request email dispatch", e);
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

    @SuppressWarnings("unchecked")
    private boolean syncPendingRefunds(Order order) {
        boolean updated = false;
        List<Map<String, Object>> items = order.getItems();
        if (items == null) return false;
        
        for (Map<String, Object> item : items) {
            String returnStatus = (String) item.get("return_status");
            if ("REFUND_PENDING".equals(returnStatus)) {
                Map<String, Object> calc = (Map<String, Object>) item.get("refund_calculations");
                if (calc != null && calc.get("refund_id") != null) {
                    String refundId = String.valueOf(calc.get("refund_id"));
                    try {
                        Map<String, Object> rzpRefund = paymentService.fetchRefund(refundId);
                        if (rzpRefund != null) {
                            String rzpStatus = (String) rzpRefund.get("status");
                            if ("processed".equalsIgnoreCase(rzpStatus)) {
                                item.put("return_status", "REFUND_COMPLETED");
                                
                                String rrn = null;
                                Object acquirerDataObj = rzpRefund.get("acquirer_data");
                                if (acquirerDataObj instanceof Map) {
                                    Map<?, ?> acquirerData = (Map<?, ?>) acquirerDataObj;
                                    if (acquirerData.get("arn") != null) {
                                        rrn = String.valueOf(acquirerData.get("arn"));
                                    } else if (acquirerData.get("rrn") != null) {
                                        rrn = String.valueOf(acquirerData.get("rrn"));
                                    }
                                } else if (acquirerDataObj != null) {
                                    try {
                                        JSONObject acqJson = new JSONObject(acquirerDataObj.toString());
                                        if (acqJson.has("arn")) rrn = acqJson.optString("arn");
                                        else if (acqJson.has("rrn")) rrn = acqJson.optString("rrn");
                                    } catch (Exception ignored) {}
                                }
                                
                                if (rrn != null) {
                                    calc.put("rrn", rrn);
                                }
                                item.put("refund_calculations", calc);
                                
                                List<Map<String, Object>> auditTimeline = (List<Map<String, Object>>) item.get("audit_timeline");
                                if (auditTimeline == null) {
                                    auditTimeline = new ArrayList<>();
                                }
                                Map<String, Object> audit = new HashMap<>();
                                audit.put("status", "REFUND_COMPLETED");
                                audit.put("timestamp", OffsetDateTime.now().toString());
                                audit.put("remarks", "Refund processed successfully by bank. RRN/ARN: " + (rrn != null ? rrn : "Pending"));
                                auditTimeline.add(audit);
                                item.put("audit_timeline", auditTimeline);
                                
                                updated = true;
                                
                                double refundAmt = 0.0;
                                if (calc.get("refundable_amount") != null) {
                                    refundAmt = Double.parseDouble(String.valueOf(calc.get("refundable_amount")));
                                }
                                triggerRefundCompletedEmail(order, refundAmt, rrn);
                            }
                        }
                    } catch (Exception e) {
                        log.error("Failed to sync pending refund status for refund ID {}: {}", refundId, e.getMessage());
                    }
                }
            }
        }
        
        if (updated) {
            boolean allRefunded = items.stream()
                .filter(i -> i.get("return_status") != null)
                .allMatch(i -> "REFUND_COMPLETED".equals(i.get("return_status")) || "RETURN_REJECTED".equals(i.get("return_status")));
            if (allRefunded) {
                order.setOrderStatus("refunded");
                order.setPaymentStatus("refunded");
            }
        }
        return updated;
    }

    private void triggerRefundCompletedEmail(Order order, double amount, String rrn) {
        try {
            userRepository.findById(order.getUserId()).ifPresent(user -> {
                String subject = "Refund Completed - " + order.getOrderNumber();
                String rrnPart = rrn != null ? "\n\nRefund Reference Number (RRN/ARN): " + rrn : "";
                String body = "Dear " + user.getFullName() + ",\n\n" +
                              "Great news! Your refund of Rs. " + String.format("%.2f", amount) + " for order " + order.getOrderNumber() + " has been successfully completed." + rrnPart + "\n\n" +
                              "⚡ The amount has been credited back to your original payment source.";
                emailClient.sendEmail(user.getEmail(), subject, body);
            });
        } catch (Exception e) {
            log.error("Failed to send refund completion email: {}", e.getMessage());
        }
    }
}
