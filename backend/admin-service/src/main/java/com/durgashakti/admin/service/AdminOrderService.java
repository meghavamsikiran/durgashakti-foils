package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import java.util.List;
import java.util.UUID;

public interface AdminOrderService {
    List<Order> getAllOrders();
    Order getOrderDetails(UUID orderId);
    Order updateOrderStatus(UUID orderId, String status);
    Order shipOrder(UUID orderId, String carrier, String trackingNumber);
}
