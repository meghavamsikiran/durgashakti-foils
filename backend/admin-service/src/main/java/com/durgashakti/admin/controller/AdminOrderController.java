package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Order;
import com.durgashakti.admin.service.AdminOrderService;
import com.durgashakti.admin.service.GstService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminOrderController {

    private final AdminOrderService adminOrderService;
    private final GstService gstService;

    public AdminOrderController(AdminOrderService adminOrderService, GstService gstService) {
        this.adminOrderService = adminOrderService;
        this.gstService = gstService;
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(adminOrderService.getAllOrders());
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Order> getOrderDetails(@PathVariable("orderId") UUID orderId) {
        return ResponseEntity.ok(adminOrderService.getOrderDetails(orderId));
    }

    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(orderId, status));
    }

    @PutMapping("/orders/{orderId}/ship")
    public ResponseEntity<Order> shipOrder(
            @PathVariable("orderId") UUID orderId,
            @RequestBody Map<String, String> payload) {
        String carrier = payload.get("carrier");
        String trackingNumber = payload.get("tracking_number");
        return ResponseEntity.ok(adminOrderService.shipOrder(orderId, carrier, trackingNumber));
    }

    @GetMapping("/gstr1/export")
    public ResponseEntity<byte[]> exportGstReport() throws IOException {
        byte[] excelBytes = gstService.exportGstReport();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gstr1_report.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(excelBytes);
    }
}
