package com.durgashakti.order.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.order.dto.*;
import com.durgashakti.common.service.InvoiceService;
import com.durgashakti.order.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while placing your order. Please try again."));
        }
    }

    @PostMapping("/payment/razorpay/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody PaymentVerifyRequest req, Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.verifyPayment(userId, req);
            return ResponseEntity.ok(order);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to verify payment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred during payment verification. Please contact support."));
        }
    }

    @PostMapping("/orders/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable("orderId") UUID orderId, Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.cancelOrder(userId, orderId);
            return ResponseEntity.ok(order);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to cancel order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while cancelling the order. Please try again."));
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
                    .body(Map.of("status", "error", "message", "Webhook processing failed"));
        }
    }

    @PostMapping("/payment/razorpay/create-for-order")
    public ResponseEntity<?> createRazorpayOrderForExistingOrder(
            @RequestBody ExistingOrderPaymentRequest req,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Map<String, Object> res = orderService.createRazorpayOrderForExistingOrder(userId, req);
            return ResponseEntity.ok(res);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create Razorpay order for existing order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while setting up payment. Please try again."));
        }
    }

    @PostMapping("/payment/razorpay/sync")
    public ResponseEntity<?> syncRazorpayPayment(
            @RequestBody RazorpaySyncRequest req,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Map<String, Object> res = orderService.syncRazorpayPayment(userId, req);
            return ResponseEntity.ok(res);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to sync payment status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while syncing payment. Please try again."));
        }
    }

    @PostMapping(value = "/orders/{orderId}/return", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> returnOrder(
            @PathVariable("orderId") UUID orderId,
            @RequestParam("reason") String reason,
            @RequestParam(value = "image", required = false) List<MultipartFile> images,
            @RequestParam(value = "items", required = false) String itemsJson,
            @RequestParam(value = "return_type", defaultValue = "refund") String returnType,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.returnOrder(userId, orderId, reason, returnType, itemsJson, images);
            return ResponseEntity.ok(order);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to submit return request", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while submitting your return. Please try again."));
        }
    }

    @PostMapping(value = "/orders/{orderId}/items/{productId}/self-ship", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> selfShipItem(
            @PathVariable("orderId") UUID orderId,
            @PathVariable("productId") UUID productId,
            @RequestParam("courier_name") String courierName,
            @RequestParam("tracking_number") String trackingNumber,
            @RequestParam(value = "tracking_url", required = false) String trackingUrl,
            @RequestParam(value = "courier_cost", required = false) Double courierCost,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "invoice", required = false) MultipartFile invoice,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString((String) authentication.getPrincipal());
            Order order = orderService.selfShipItem(userId, orderId, productId, courierName, trackingNumber, trackingUrl, courierCost, notes, invoice);
            return ResponseEntity.ok(order);
        } catch (ApiException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to submit self ship details", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "An unexpected error occurred while submitting self shipment details. Please try again."));
        }
    }
}
