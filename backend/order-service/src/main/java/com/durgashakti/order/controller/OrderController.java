package com.durgashakti.order.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.order.dto.OrderCreateRequest;
import com.durgashakti.order.dto.PaymentVerifyRequest;
import com.durgashakti.order.service.InvoiceService;
import com.durgashakti.order.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
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

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final InvoiceService invoiceService;

    public OrderController(OrderService orderService, InvoiceService invoiceService) {
        this.orderService = orderService;
        this.invoiceService = invoiceService;
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody OrderCreateRequest req, Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.createOrder(userId, req);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Failed to create order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to place order: " + e.getMessage()));
        }
    }

    @PostMapping("/payment/razorpay/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody PaymentVerifyRequest req, Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.verifyPayment(userId, req);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Failed to verify payment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Payment verification failed: " + e.getMessage()));
        }
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable("orderId") UUID orderId, Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.cancelOrder(userId, orderId);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Failed to cancel order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Cancellation failed: " + e.getMessage()));
        }
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
        try {
            orderService.processRazorpayWebhook(body, signature);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            log.error("Failed to process Razorpay webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
