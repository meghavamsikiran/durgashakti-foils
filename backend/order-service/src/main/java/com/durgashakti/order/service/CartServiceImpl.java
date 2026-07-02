package com.durgashakti.order.service;

import com.durgashakti.common.entity.Cart;
import com.durgashakti.common.entity.Product;
import com.durgashakti.order.repository.OrderCartRepository;
import com.durgashakti.order.repository.OrderProductRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class CartServiceImpl implements CartService {

    private final OrderCartRepository cartRepository;
    private final OrderProductRepository productRepository;

    public CartServiceImpl(OrderCartRepository cartRepository, OrderProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getCart(UUID userId) {
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            return Map.of("items", List.of());
        }
        List<Map<String, Object>> items = cartOpt.get().getItems();
        return Map.of("items", items != null ? items : List.of());
    }

    @Override
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

    @Override
    public void clearCart(UUID userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.setItems(new ArrayList<>());
            cart.setUpdatedAt(OffsetDateTime.now());
            cartRepository.save(cart);
        });
    }

    @Override
    public Map<String, Object> addToCart(UUID userId, UUID productId, int quantity) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElse(new Cart());

        if (cart.getUserId() == null) {
            cart.setUserId(userId);
            cart.setItems(new ArrayList<>());
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        int maxStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        if (maxStock <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Product is out of stock");
        }

        List<Map<String, Object>> items = new ArrayList<>(cart.getItems());
        boolean found = false;
        for (Map<String, Object> item : items) {
            if (productId.toString().equals(item.get("product_id"))) {
                int curQty = ((Number) item.getOrDefault("quantity", 0)).intValue();
                item.put("quantity", Math.min(curQty + quantity, maxStock));
                found = true;
                break;
            }
        }

        if (!found) {
            Map<String, Object> newItem = new HashMap<>();
            newItem.put("id", UUID.randomUUID().toString());
            newItem.put("product_id", productId.toString());
            newItem.put("quantity", Math.min(quantity, maxStock));
            items.add(newItem);
        }

        cart.setItems(items);
        cart.setUpdatedAt(OffsetDateTime.now());
        Cart saved = cartRepository.save(cart);

        return Map.of("message", "Item added to cart", "items", saved.getItems());
    }

    @Override
    public Map<String, Object> updateCartItem(UUID userId, UUID productId, int quantity) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));

        int maxStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;

        List<Map<String, Object>> items = new ArrayList<>(cart.getItems());
        List<Map<String, Object>> updatedItems = new ArrayList<>();

        for (Map<String, Object> item : items) {
            if (productId.toString().equals(item.get("product_id"))) {
                if (quantity > 0 && maxStock > 0) {
                    item.put("quantity", Math.min(quantity, maxStock));
                    updatedItems.add(item);
                }
            } else {
                updatedItems.add(item);
            }
        }

        cart.setItems(updatedItems);
        cart.setUpdatedAt(OffsetDateTime.now());
        Cart saved = cartRepository.save(cart);

        return Map.of("message", "Cart updated", "items", saved.getItems());
    }

    @Override
    public Map<String, Object> removeFromCart(UUID userId, UUID productId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart not found"));

        List<Map<String, Object>> items = new ArrayList<>(cart.getItems());
        items.removeIf(item -> productId.toString().equals(item.get("product_id")));

        cart.setItems(items);
        cart.setUpdatedAt(OffsetDateTime.now());
        Cart saved = cartRepository.save(cart);

        return Map.of("message", "Item removed from cart", "items", saved.getItems());
    }
}
