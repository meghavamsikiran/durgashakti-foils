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

    @DeleteMapping("/cart/clear")
    public ResponseEntity<Map<String, String>> clearCartAlt(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        cartService.clearCart(userId);
        return ResponseEntity.ok(Map.of("message", "Cart cleared successfully"));
    }

    @PostMapping("/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestBody Map<String, Object> req,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        UUID productId = UUID.fromString(req.get("product_id").toString());
        int quantity = ((Number) req.getOrDefault("quantity", 1)).intValue();
        return ResponseEntity.ok(cartService.addToCart(userId, productId, quantity));
    }

    @PutMapping("/cart/update")
    public ResponseEntity<Map<String, Object>> updateCartItem(
            @RequestBody Map<String, Object> req,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        UUID productId = UUID.fromString(req.get("product_id").toString());
        int quantity = ((Number) req.get("quantity")).intValue();
        return ResponseEntity.ok(cartService.updateCartItem(userId, productId, quantity));
    }

    @DeleteMapping("/cart/remove/{productId}")
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @PathVariable("productId") UUID productId,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(cartService.removeFromCart(userId, productId));
    }
}
