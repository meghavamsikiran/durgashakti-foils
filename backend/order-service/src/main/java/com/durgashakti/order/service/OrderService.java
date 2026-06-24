package com.durgashakti.order.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.order.dto.OrderCreateRequest;
import com.durgashakti.order.dto.PaymentVerifyRequest;
import java.util.List;
import java.util.UUID;

public interface OrderService {
    Order createOrder(UUID userId, OrderCreateRequest req);
    Order verifyPayment(UUID userId, PaymentVerifyRequest req);
    Order cancelOrder(UUID userId, UUID orderId);
    List<Order> getUserOrders(UUID userId);
    Order getOrderById(UUID userId, UUID orderId);
    void processRazorpayWebhook(String eventBody, String signature);
}
