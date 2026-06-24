package com.durgashakti.order.service;

import com.durgashakti.common.entity.Cart;
import com.durgashakti.common.entity.Product;
import com.durgashakti.order.repository.CartRepository;
import com.durgashakti.order.repository.OrderProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final OrderProductRepository productRepository;

    public CartService(CartRepository cartRepository, OrderProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCart(UUID userId) {
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            return Map.of("items", List.of());
        }
        return Map.of("items", cartOpt.get().getItems());
    }

    public Map<String, Object> bulkSyncCart(UUID userId, List<Map<String, Object>> items) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElse(new Cart());

        if (cart.getUserId() == null) {
            cart.setUserId(userId);
            cart.setItems(new ArrayList<>());
        }

        List<Map<String, Object>> currentItems = new ArrayList<>(cart.getItems());

        for (Map<String, Object> newItem : items) {
            Object pIdObj = newItem.get("product_id");
            if (pIdObj == null) continue;
            UUID productId = UUID.fromString(pIdObj.toString());

            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isEmpty()) continue;
            Product product = prodOpt.get();

            int quantity = ((Number) newItem.getOrDefault("quantity", 1)).intValue();
            int maxStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            if (maxStock <= 0) continue;

            // Check if exists
            boolean found = false;
            for (Map<String, Object> curItem : currentItems) {
                if (productId.toString().equals(curItem.get("product_id"))) {
                    int curQty = ((Number) curItem.getOrDefault("quantity", 0)).intValue();
                    curItem.put("quantity", Math.min(curQty + quantity, maxStock));
                    found = true;
                    break;
                }
            }

            if (!found) {
                Map<String, Object> addedItem = new HashMap<>(newItem);
                addedItem.put("id", UUID.randomUUID().toString());
                addedItem.put("quantity", Math.min(quantity, maxStock));
                currentItems.add(addedItem);
            }
        }

        cart.setItems(currentItems);
        cart.setUpdatedAt(OffsetDateTime.now());
        Cart saved = cartRepository.save(cart);

        return Map.of("message", "Cart synchronized", "items", saved.getItems());
    }

    public void clearCart(UUID userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.setItems(new ArrayList<>());
            cart.setUpdatedAt(OffsetDateTime.now());
            cartRepository.save(cart);
        });
    }
}
