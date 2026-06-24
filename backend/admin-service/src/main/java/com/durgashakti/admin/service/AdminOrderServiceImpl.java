package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.admin.repository.AdminOrderRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminOrderServiceImpl implements AdminOrderService {

    private final AdminOrderRepository orderRepository;

    public AdminOrderServiceImpl(AdminOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderDetails(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @Override
    public Order updateOrderStatus(UUID orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setOrderStatus(status);
        order.setUpdatedAt(OffsetDateTime.now());
        return orderRepository.save(order);
    }

    @Override
    public Order shipOrder(UUID orderId, String carrier, String trackingNumber) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        order.setOrderStatus("shipped");
        order.setCarrier(carrier);
        order.setTrackingNumber(trackingNumber);
        order.setShipmentStatus("shipped");
        order.setShipmentDate(OffsetDateTime.now());
        order.setUpdatedAt(OffsetDateTime.now());
        return orderRepository.save(order);
    }
}
