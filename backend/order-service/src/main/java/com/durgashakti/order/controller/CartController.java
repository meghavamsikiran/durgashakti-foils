package com.durgashakti.order.controller;

import com.durgashakti.order.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @PostMapping("/cart/bulk-sync")
    public ResponseEntity<Map<String, Object>> bulkSyncCart(
            @RequestBody List<Map<String, Object>> items,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(cartService.bulkSyncCart(userId, items));
    }

    @DeleteMapping("/cart")
    public ResponseEntity<Map<String, String>> clearCart(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        cartService.clearCart(userId);
        return ResponseEntity.ok(Map.of("message", "Cart cleared successfully"));
    }
}
