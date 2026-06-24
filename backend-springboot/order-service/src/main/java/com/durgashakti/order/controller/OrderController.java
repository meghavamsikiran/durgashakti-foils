package com.durgashakti.order.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.order.dto.OrderCreateRequest;
import com.durgashakti.order.dto.PaymentVerifyRequest;
import com.durgashakti.order.service.InvoiceService;
import com.durgashakti.order.service.OrderService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class OrderController {

    private final OrderService orderService;
    private final InvoiceService invoiceService;

    public OrderController(OrderService orderService, InvoiceService invoiceService) {
        this.orderService = orderService;
        this.invoiceService = invoiceService;
    }

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody OrderCreateRequest req, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Order order = orderService.createOrder(userId, req);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/payment/razorpay/verify")
    public ResponseEntity<Order> verifyPayment(@RequestBody PaymentVerifyRequest req, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Order order = orderService.verifyPayment(userId, req);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable("orderId") UUID orderId, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Order order = orderService.cancelOrder(userId, orderId);
        return ResponseEntity.ok(order);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getUserOrders(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(orderService.getUserOrders(userId));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Order> getOrderById(@PathVariable("orderId") UUID orderId, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(orderService.getOrderById(userId, orderId));
    }

    @GetMapping("/orders/{orderId}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable("orderId") UUID orderId, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Order order = orderService.getOrderById(userId, orderId);
        byte[] pdfBytes = invoiceService.generateInvoicePdf(order);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice_" + order.getOrderNumber() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/payment/razorpay/webhook")
    public ResponseEntity<Map<String, String>> processRazorpayWebhook(
            @RequestBody String body,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        orderService.processRazorpayWebhook(body, signature);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
