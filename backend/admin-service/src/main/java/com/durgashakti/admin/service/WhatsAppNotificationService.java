package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.Setting;
import com.durgashakti.admin.repository.AdminSettingRepository;
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
import java.util.Optional;

@Service
public class WhatsAppNotificationService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotificationService.class);

    @Value("${whatsapp.api.token:}")
    private String envWhatsAppApiToken;

    @Value("${whatsapp.phone.number.id:}")
    private String envWhatsAppPhoneNumberId;

    @Value("${whatsapp.business.number:919901452954}")
    private String envWhatsAppBusinessNumber;

    private final AdminSettingRepository settingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public WhatsAppNotificationService(AdminSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    /**
     * Triggers post-delivery feedback notification via Meta WhatsApp Cloud API dynamically configured from database or env.
     */
    public void sendPostDeliveryFeedback(Order order) {
        if (order == null) return;

        // Fetch dynamic settings saved by Superadmin in Admin Panel
        String apiToken = envWhatsAppApiToken;
        String phoneNumberId = envWhatsAppPhoneNumberId;
        String businessNumber = envWhatsAppBusinessNumber;
        boolean isEnabled = true;

        try {
            Optional<Setting> settingOpt = settingRepository.findById("whatsapp_ai_feedback");
            if (settingOpt.isPresent()) {
                Map<String, Object> val = settingOpt.get().getValue();
                if (val != null) {
                    if (val.containsKey("enabled") && val.get("enabled") instanceof Boolean) {
                        isEnabled = (Boolean) val.get("enabled");
                    }
                    if (val.containsKey("apiToken") && val.get("apiToken") != null && !val.get("apiToken").toString().isBlank()) {
                        apiToken = val.get("apiToken").toString().trim();
                    }
                    if (val.containsKey("phoneNumberId") && val.get("phoneNumberId") != null && !val.get("phoneNumberId").toString().isBlank()) {
                        phoneNumberId = val.get("phoneNumberId").toString().trim();
                    }
                    if (val.containsKey("businessNumber") && val.get("businessNumber") != null && !val.get("businessNumber").toString().isBlank()) {
                        businessNumber = val.get("businessNumber").toString().replaceAll("[^0-9]", "");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[WhatsApp Notification] Failed to read dynamic database settings: {}", e.getMessage());
        }

        if (!isEnabled) {
            log.info("[WhatsApp Notification] Post-delivery triggers are currently disabled in Settings.");
            return;
        }

        Map<String, Object> shippingAddress = order.getShippingAddress();
        String customerName = "Valued Customer";
        String customerPhone = null;

        if (shippingAddress != null) {
            for (String nameKey : List.of("fullName", "full_name", "name", "recipient_name")) {
                if (shippingAddress.containsKey(nameKey) && shippingAddress.get(nameKey) != null) {
                    String n = String.valueOf(shippingAddress.get(nameKey)).trim();
                    if (!n.isBlank() && !"null".equalsIgnoreCase(n)) {
                        customerName = n;
                        break;
                    }
                }
            }

            for (String phoneKey : List.of("phone", "mobile", "mobileNumber", "mobile_number", "phone_number", "contact", "contact_number")) {
                if (shippingAddress.containsKey(phoneKey) && shippingAddress.get(phoneKey) != null) {
                    String p = String.valueOf(shippingAddress.get(phoneKey)).trim();
                    if (!p.isBlank() && !"null".equalsIgnoreCase(p)) {
                        customerPhone = p;
                        break;
                    }
                }
            }
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

        // If WhatsApp Cloud API credentials are set, dispatch directly via Meta API
        if (apiToken != null && !apiToken.isBlank() && phoneNumberId != null && !phoneNumberId.isBlank()) {
            try {
                String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiToken);

                Map<String, Object> body = new HashMap<>();
                body.put("messaging_product", "whatsapp");
                body.put("to", cleanedPhone);
                body.put("type", "template");

                Map<String, Object> template = new HashMap<>();
                // Use Meta's pre-approved developer test template 'jaspers_market_order_confirmation'
                template.put("name", "jaspers_market_order_confirmation");
                template.put("language", Map.of("code", "en_US"));
                body.put("template", template);

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                restTemplate.postForEntity(url, request, String.class);
                log.info("[WhatsApp Cloud API] Successfully dispatched WhatsApp message to {}", cleanedPhone);
            } catch (Exception e) {
                log.error("[WhatsApp Cloud API Error] Failed to send WhatsApp message to {}: {}", cleanedPhone, e.getMessage());
                // Fallback attempt with 'hello_world' if jaspers_market_order_confirmation fails
                try {
                    String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.setBearerAuth(apiToken);
                    Map<String, Object> body = new HashMap<>();
                    body.put("messaging_product", "whatsapp");
                    body.put("to", cleanedPhone);
                    body.put("type", "template");
                    body.put("template", Map.of("name", "hello_world", "language", Map.of("code", "en_US")));
                    restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
                    log.info("[WhatsApp Cloud API Fallback] Dispatched hello_world template to {}", cleanedPhone);
                } catch (Exception ex) {
                    log.error("[WhatsApp Cloud API Fallback Error] {}", ex.getMessage());
                }
            }
        } else {
            log.info("[WhatsApp Notification] Meta API credentials not configured. Business Line: {}, Order #{}: https://wa.me/{}?text=Hi%20DurgaShakti%20Foils,%20I%20have%20feedback%20regarding%20my%20delivered%20order%20%23{}",
                    businessNumber, order.getOrderNumber(), businessNumber, order.getOrderNumber());
        }
    }
}
