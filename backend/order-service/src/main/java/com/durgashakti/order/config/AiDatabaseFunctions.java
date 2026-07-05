package com.durgashakti.order.config;

import com.durgashakti.common.entity.Order;
import com.durgashakti.order.repository.OrderServiceRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.function.Function;

@Configuration
public class AiDatabaseFunctions {

    private final OrderServiceRepository orderRepository;

    public AiDatabaseFunctions(OrderServiceRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Function 1: Retrieve Live Order Details & Shipment Info
    @Bean
    @Description("Fetch live order status, payment status, tracking details, and product items by human-readable order number (e.g. DSF-20260705-88783)")
    public Function<OrderRequest, OrderResponse> getOrderInfo() {
        return request -> {
            try {
                String num = request.orderNumber();
                if (num == null || num.trim().isEmpty()) {
                    return new OrderResponse("Order number is required", null, null, null);
                }
                
                Order order = orderRepository.findByOrderNumber(num.trim()).orElse(null);
                if (order == null) {
                    // Fallback to searching without the prefix in case customer entered only the last numeric parts
                    String cleanNum = num.replaceAll("[^0-9]", "");
                    if (!cleanNum.isEmpty()) {
                        order = orderRepository.findAll().stream()
                            .filter(o -> o.getOrderNumber() != null && o.getOrderNumber().contains(cleanNum))
                            .findFirst().orElse(null);
                    }
                }
                
                if (order == null) {
                    return new OrderResponse("Order not found with number: " + num, null, null, null);
                }
                
                return new OrderResponse(
                    order.getOrderStatus(),
                    order.getPaymentStatus(),
                    order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not Shipped Yet",
                    order.getItems()
                );
            } catch (Exception e) {
                return new OrderResponse("Error retrieving order details: " + e.getMessage(), null, null, null);
            }
        };
    }

    public record OrderRequest(String orderNumber) {}
    public record OrderResponse(String orderStatus, String paymentStatus, String trackingNumber, Object items) {}
}
