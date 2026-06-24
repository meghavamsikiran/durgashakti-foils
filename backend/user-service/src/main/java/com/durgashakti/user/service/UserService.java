package com.durgashakti.user.service;

import com.durgashakti.common.entity.Address;
import com.durgashakti.common.entity.Notification;
import com.durgashakti.common.entity.Product;
import com.durgashakti.user.dto.UserAddressRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface UserService {
    List<Address> getAddresses(UUID userId);
    Address addAddress(UUID userId, UserAddressRequest req);
    Address updateAddress(UUID userId, UUID addressId, UserAddressRequest req);
    void deleteAddress(UUID userId, UUID addressId);
    List<Product> getWishlist(UUID userId);
    Map<String, String> toggleWishlist(UUID userId, UUID productId);
    void clearWishlist(UUID userId);
    List<Notification> getNotifications(UUID userId);
    void markNotificationsRead(UUID userId);
}
