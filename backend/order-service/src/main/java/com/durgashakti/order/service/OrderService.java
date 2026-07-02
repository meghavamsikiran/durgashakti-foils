package com.durgashakti.order.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.order.dto.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface OrderService {
    Order createOrder(UUID userId, OrderCreateRequest req);
    Order verifyPayment(UUID userId, PaymentVerifyRequest req);
    Order cancelOrder(UUID userId, UUID orderId);
    List<Order> getUserOrders(UUID userId);
    Order getOrderById(UUID userId, UUID orderId);
    void processRazorpayWebhook(String body, String signature);
    
    Map<String, Object> createRazorpayOrderForExistingOrder(UUID userId, ExistingOrderPaymentRequest req);
    Map<String, Object> syncRazorpayPayment(UUID userId, RazorpaySyncRequest req);
}
