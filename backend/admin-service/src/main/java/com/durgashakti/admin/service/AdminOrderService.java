package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface AdminOrderService {
    List<Order> getAllOrders();
    Order getOrderDetails(UUID orderId);
    Order updateOrderStatus(UUID orderId, String status);
    Order updateOrderStatus(UUID orderId, String status, String carrier, String trackingNumber, String expectedDeliveryDate, String shipmentNotes);
    Order shipOrder(UUID orderId, String carrier, String trackingNumber);
    Map<String, Object> bulkShipOrders(List<Map<String, String>> shipments);
    Order itemReturnAction(UUID orderId, String productId, String action, String remarks);
    Order receiveReturnedItem(UUID orderId, String productId);
    Order processItemRefund(UUID orderId, String productId, boolean restock, Double manualAmount, boolean isManual);
    Order retryRefund(UUID orderId, String productId);
    Order shipExchangeItem(UUID orderId, String productId, String courier, String trackingNumber, String expectedDeliveryDate, String notes);
    Order completeExchangeItem(UUID orderId, String productId);
}
