package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotificationService.class);

    @Value("${whatsapp.api.token:}")
    private String whatsAppApiToken;

    @Value("${whatsapp.phone.number.id:}")
    private String whatsAppPhoneNumberId;

    @Value("${whatsapp.business.number:919999999999}")
    private String whatsAppBusinessNumber;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Triggers post-delivery feedback notification via WhatsApp Cloud API or logs webhook payload.
     */
    public void sendPostDeliveryFeedback(Order order) {
        if (order == null) return;

        Map<String, Object> shippingAddress = order.getShippingAddress();
        String customerName = "Valued Customer";
        String customerPhone = null;

        if (shippingAddress != null) {
            customerName = String.valueOf(shippingAddress.getOrDefault("fullName", 
                           shippingAddress.getOrDefault("name", "Valued Customer")));
            customerPhone = String.valueOf(shippingAddress.getOrDefault("mobileNumber", 
                            shippingAddress.getOrDefault("phone", "")));
        }

        if (customerPhone == null || customerPhone.isBlank() || "null".equalsIgnoreCase(customerPhone)) {
            log.warn("[WhatsApp Notification] No phone number available for Order #{}", order.getOrderNumber());
            return;
        }

        // Clean phone number (ensure country code e.g. +91 or 91 prefix)
        String cleanedPhone = customerPhone.replaceAll("[^0-9]", "");
        if (cleanedPhone.length() == 10) {
            cleanedPhone = "91" + cleanedPhone;
        }

        log.info("[WhatsApp Notification Trigger] Post-delivery feedback sequence initiated for Order #{}, Customer: {}, Phone: {}",
                order.getOrderNumber(), customerName, cleanedPhone);

        // If WhatsApp Cloud API credentials are setup in application properties/env, dispatch directly
        if (whatsAppApiToken != null && !whatsAppApiToken.isBlank() && 
            whatsAppPhoneNumberId != null && !whatsAppPhoneNumberId.isBlank()) {
            try {
                String url = "https://graph.facebook.com/v18.0/" + whatsAppPhoneNumberId + "/messages";

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(whatsAppApiToken);

                Map<String, Object> body = new HashMap<>();
                body.put("messaging_product", "whatsapp");
                body.put("to", cleanedPhone);
                body.put("type", "template");

                Map<String, Object> template = new HashMap<>();
                template.put("name", "order_delivery_feedback");
                template.put("language", Map.of("code", "en_US"));
                
                Map<String, Object> param1 = Map.of("type", "text", "text", customerName);
                Map<String, Object> param2 = Map.of("type", "text", "text", order.getOrderNumber());
                template.put("components", List.of(Map.of("type", "body", "parameters", List.of(param1, param2))));

                body.put("template", template);

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                restTemplate.postForEntity(url, request, String.class);
                log.info("[WhatsApp Cloud API] Successfully dispatched WhatsApp feedback template to {}", cleanedPhone);
            } catch (Exception e) {
                log.error("[WhatsApp Cloud API Error] Failed to send WhatsApp message to {}: {}", cleanedPhone, e.getMessage());
            }
        } else {
            log.info("[WhatsApp Notification] Credentials not set. Generated fallback WhatsApp feedback URL for Order #{}: https://wa.me/{}?text=Hi%20DurgaShakti%20Foils,%20I%20have%20feedback%20regarding%20my%20delivered%20order%20%23{}",
                    order.getOrderNumber(), whatsAppBusinessNumber, order.getOrderNumber());
        }
    }
}
