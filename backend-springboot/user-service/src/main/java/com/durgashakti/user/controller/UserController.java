package com.durgashakti.user.controller;

import com.durgashakti.common.entity.Address;
import com.durgashakti.common.entity.Notification;
import com.durgashakti.common.entity.Product;
import com.durgashakti.user.dto.UserAddressRequest;
import com.durgashakti.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ── Addresses ──

    @GetMapping("/addresses")
    public ResponseEntity<List<Address>> getAddresses(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.getAddresses(userId));
    }

    @PostMapping("/addresses")
    public ResponseEntity<Address> addAddress(@RequestBody UserAddressRequest req, Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.addAddress(userId, req));
    }

    @PutMapping("/addresses/{addressId}")
    public ResponseEntity<Address> updateAddress(@PathVariable("addressId") UUID addressId,
                                                 @RequestBody UserAddressRequest req,
                                                 Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.updateAddress(userId, addressId, req));
    }

    @DeleteMapping("/addresses/{addressId}")
    public ResponseEntity<Map<String, String>> deleteAddress(@PathVariable("addressId") UUID addressId,
                                                             Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        userService.deleteAddress(userId, addressId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // ── Wishlist ──

    @GetMapping("/wishlist")
    public ResponseEntity<List<Product>> getWishlist(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.getWishlist(userId));
    }

    @PostMapping("/wishlist/{productId}")
    public ResponseEntity<Map<String, String>> toggleWishlist(@PathVariable("productId") UUID productId,
                                                              Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.toggleWishlist(userId, productId));
    }

    @DeleteMapping("/wishlist")
    public ResponseEntity<Map<String, String>> clearWishlist(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        userService.clearWishlist(userId);
        return ResponseEntity.ok(Map.of("message", "Wishlist cleared successfully"));
    }

    // ── Notifications ──

    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getNotifications(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return ResponseEntity.ok(userService.getNotifications(userId));
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Map<String, String>> markNotificationsRead(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        userService.markNotificationsRead(userId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
