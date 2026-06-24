package com.durgashakti.user.service;

import com.durgashakti.common.entity.*;
import com.durgashakti.common.exception.ApiException;
import com.durgashakti.user.dto.UserAddressRequest;
import com.durgashakti.user.repository.AddressRepository;
import com.durgashakti.user.repository.NotificationRepository;
import com.durgashakti.user.repository.UserProductRepository;
import com.durgashakti.user.repository.UserProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class UserService {

    private final AddressRepository addressRepository;
    private final UserProfileRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final UserProductRepository productRepository;

    public UserService(AddressRepository addressRepository,
                       UserProfileRepository userRepository,
                       NotificationRepository notificationRepository,
                       UserProductRepository productRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Address> getAddresses(UUID userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDesc(userId);
    }

    public Address addAddress(UUID userId, UserAddressRequest req) {
        if (req.isDefault()) {
            resetDefaultAddresses(userId);
        }
        Address addr = new Address();
        addr.setUserId(userId);
        addr.setLabel(req.getLabel());
        addr.setFullName(req.getFullName());
        addr.setPhone(req.getPhone());
        addr.setAlternatePhone(req.getAlternatePhone());
        addr.setAddressLine1(req.getAddressLine1());
        addr.setAddressLine2(req.getAddressLine2());
        addr.setCity(req.getCity());
        addr.setState(req.getState());
        addr.setPincode(req.getPincode());
        addr.setIsDefault(req.isDefault());
        return addressRepository.save(addr);
    }

    public Address updateAddress(UUID userId, UUID addressId, UserAddressRequest req) {
        Address addr = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));

        if (req.isDefault()) {
            resetDefaultAddresses(userId);
        }
        addr.setLabel(req.getLabel());
        addr.setFullName(req.getFullName());
        addr.setPhone(req.getPhone());
        addr.setAlternatePhone(req.getAlternatePhone());
        addr.setAddressLine1(req.getAddressLine1());
        addr.setAddressLine2(req.getAddressLine2());
        addr.setCity(req.getCity());
        addr.setState(req.getState());
        addr.setPincode(req.getPincode());
        addr.setIsDefault(req.isDefault());
        return addressRepository.save(addr);
    }

    public void deleteAddress(UUID userId, UUID addressId) {
        Address addr = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
        addressRepository.delete(addr);
    }

    @Transactional(readOnly = true)
    public List<Product> getWishlist(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        List<Object> wishlist = user.getWishlist();
        if (wishlist == null || wishlist.isEmpty()) {
            return List.of();
        }

        List<UUID> productIds = new ArrayList<>();
        for (Object item : wishlist) {
            if (item instanceof Map) {
                Map<String, Object> mItem = (Map<String, Object>) item;
                Object pId = mItem.get("product_id");
                if (pId != null) {
                    try {
                        productIds.add(UUID.fromString(pId.toString()));
                    } catch (IllegalArgumentException ignored) {}
                }
            }
        }

        if (productIds.isEmpty()) {
            return List.of();
        }

        return productRepository.findByIdIn(productIds);
    }

    public Map<String, String> toggleWishlist(UUID userId, UUID productId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        List<Object> wishlist = user.getWishlist();
        if (wishlist == null) {
            wishlist = new ArrayList<>();
        }

        int foundIndex = -1;
        for (int i = 0; i < wishlist.size(); i++) {
            Object item = wishlist.get(i);
            if (item instanceof Map) {
                Map<String, Object> mItem = (Map<String, Object>) item;
                if (productId.toString().equals(mItem.get("product_id"))) {
                    foundIndex = i;
                    break;
                }
            }
        }

        if (foundIndex != -1) {
            wishlist.remove(foundIndex);
            user.setWishlist(wishlist);
            userRepository.save(user);
            return Map.of("status", "removed");
        } else {
            Map<String, Object> newItem = new HashMap<>();
            newItem.put("id", UUID.randomUUID().toString());
            newItem.put("product_id", productId.toString());
            newItem.put("created_at", OffsetDateTime.now().toString());
            wishlist.add(newItem);
            user.setWishlist(wishlist);
            userRepository.save(user);
            return Map.of("status", "added");
        }
    }

    public void clearWishlist(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setWishlist(new ArrayList<>());
        userRepository.save(user);
    }

    public List<Notification> getNotifications(UUID userId) {
        // Auto-delete read notifications older than 3 days
        OffsetDateTime threeDaysAgo = OffsetDateTime.now().minusDays(3);
        notificationRepository.deleteReadNotificationsOlderThan(userId, threeDaysAgo);

        // Fetch remaining
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (notifications.size() > 50) {
            return notifications.subList(0, 50);
        }
        return notifications;
    }

    public void markNotificationsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId);
    }

    private void resetDefaultAddresses(UUID userId) {
        List<Address> list = addressRepository.findByUserIdOrderByIsDefaultDesc(userId);
        for (Address a : list) {
            if (Boolean.TRUE.equals(a.getIsDefault())) {
                a.setIsDefault(false);
                addressRepository.save(a);
            }
        }
    }
}
