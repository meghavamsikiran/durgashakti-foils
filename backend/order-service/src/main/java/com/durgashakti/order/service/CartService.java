package com.durgashakti.order.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CartService {
    Map<String, Object> getCart(UUID userId);
    Map<String, Object> bulkSyncCart(UUID userId, List<Map<String, Object>> items);
    void clearCart(UUID userId);
}
