package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.admin.repository.AdminOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private final AdminOrderRepository orderRepository;

    public AnalyticsServiceImpl(AdminOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public Map<String, Object> getDashboardSummary() {
        List<Order> orders = orderRepository.findAll();

        double totalRevenue = 0.0;
        int totalOrders = orders.size();
        Map<String, Integer> statusCounts = new HashMap<>();

        for (Order order : orders) {
            String status = order.getOrderStatus() != null ? order.getOrderStatus().toLowerCase() : "unknown";
            statusCounts.put(status, statusCounts.getOrDefault(status, 0) + 1);

            String paymentStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "";
            if ("paid".equals(paymentStatus) || "completed".equals(paymentStatus) || "cash on delivery".equals(paymentStatus)) {
                totalRevenue += order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0;
            }
        }

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("total_revenue", Math.round(totalRevenue * 100.0) / 100.0);
        metrics.put("total_orders", totalOrders);

        Map<String, Object> summary = new HashMap<>();
        summary.put("metrics", metrics);
        summary.put("order_status_counts", statusCounts);
        return summary;
    }
}
