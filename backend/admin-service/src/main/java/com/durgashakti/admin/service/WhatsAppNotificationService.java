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
import org.springframework.web.client.HttpStatusCodeException;
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

    @Value("${whatsapp.business.number:918618881969}")
    private String envWhatsAppBusinessNumber;

    private final AdminSettingRepository settingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public WhatsAppNotificationService(AdminSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public static String cleanPhoneNumber(String phone) {
        if (phone == null || phone.isBlank() || "null".equalsIgnoreCase(phone)) return null;
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("0")) {
            digits = digits.replaceFirst("^0+", "");
        }
        if (digits.length() == 10) {
            digits = "91" + digits;
        }
        return digits;
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
            for (String nameKey : List.of("full_name", "fullName", "name", "recipient_name")) {
                if (shippingAddress.containsKey(nameKey) && shippingAddress.get(nameKey) != null) {
                    String n = String.valueOf(shippingAddress.get(nameKey)).trim();
                    if (!n.isBlank() && !"null".equalsIgnoreCase(n)) {
                        customerName = n;
                        break;
                    }
                }
            }

            for (String phoneKey : List.of("phone", "mobile", "mobileNumber", "mobile_number", "phone_number", "contact", "contact_number", "alternate_phone")) {
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
            log.warn("[WhatsApp Notification] No phone number available in address for Order #{}", order.getOrderNumber());
            return;
        }

        String cleanedPhone = cleanPhoneNumber(customerPhone);
        if (cleanedPhone == null || cleanedPhone.isBlank()) {
            log.warn("[WhatsApp Notification] Could not format valid 10-12 digit phone for Order #{}", order.getOrderNumber());
            return;
        }

        log.info("[WhatsApp Notification Trigger] Post-delivery feedback sequence initiated for Order #{}, Customer: {}, Phone: {}",
                order.getOrderNumber(), customerName, cleanedPhone);

        // If WhatsApp Cloud API credentials are set, dispatch directly via Meta API
        if (apiToken != null && !apiToken.isBlank() && phoneNumberId != null && !phoneNumberId.isBlank()) {
            boolean dispatched = false;

            // Priority templates
            List<String> candidateTemplates = List.of(
                "order_delivered_v1",
                "order_delivered",
                "hello_world"
            );

            List<String> langCodes = List.of("en_US", "en", "en_GB", "hi", "hi_IN");
            for (String templateName : candidateTemplates) {
                if (dispatched) break;
                for (String lang : langCodes) {
                    if (dispatched) break;
                    for (String apiVer : List.of("v20.0", "v25.0", "v18.0")) {
                        if (dispatched) break;
                        try {
                            String url = "https://graph.facebook.com/" + apiVer + "/" + phoneNumberId + "/messages";

                            HttpHeaders headers = new HttpHeaders();
                            headers.setContentType(MediaType.APPLICATION_JSON);
                            headers.setBearerAuth(apiToken);

                            Map<String, Object> body = new HashMap<>();
                            body.put("messaging_product", "whatsapp");
                            body.put("to", cleanedPhone);
                            body.put("type", "template");

                            Map<String, Object> template = new HashMap<>();
                            template.put("name", templateName);
                            template.put("language", Map.of("code", lang));

                            // Pass dynamic parameters based on template requirements
                            if ("order_delivered_v1".equals(templateName)) {
                                template.put("components", List.of(
                                    Map.of(
                                        "type", "body",
                                        "parameters", List.of(
                                            Map.of("type", "text", "text", customerName),
                                            Map.of("type", "text", "text", order.getOrderNumber())
                                        )
                                    )
                                ));
                            } else if ("order_delivered".equals(templateName)) {
                                template.put("components", List.of(
                                    Map.of(
                                        "type", "body",
                                        "parameters", List.of(
                                            Map.of("type", "text", "text", order.getOrderNumber())
                                        )
                                    )
                                ));
                            }
                            // Note: hello_world requires NO components parameter

                            body.put("template", template);

                            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                            restTemplate.postForEntity(url, request, String.class);
                            log.info("[WhatsApp Cloud API] Successfully dispatched template '{}' ({}) via {} to {}", templateName, lang, apiVer, cleanedPhone);
                            dispatched = true;
                        } catch (HttpStatusCodeException httpEx) {
                            log.warn("[WhatsApp Cloud API] Template '{}' ({}) via {} failed: {}", templateName, lang, apiVer, httpEx.getResponseBodyAsString());
                        } catch (Exception e) {
                            log.warn("[WhatsApp Cloud API] Template '{}' ({}) via {} failed for {}: {}", templateName, lang, apiVer, cleanedPhone, e.getMessage());
                        }
                    }
                }
            }
        } else {
            log.info("[WhatsApp Notification] Meta API credentials not configured. Business Line: {}, Order #{}: https://wa.me/{}?text=Hi%20DurgaShakti%20Foils,%20I%20have%20feedback%20regarding%20my%20delivered%20order%20%23{}",
                    businessNumber, order.getOrderNumber(), businessNumber, order.getOrderNumber());
        }
    }

    /**
     * Triggers order shipped notification via Meta WhatsApp Cloud API using order_shipped_v1 template.
     */
    public void sendOrderShippedNotification(Order order) {
        if (order == null) return;

        String apiToken = envWhatsAppApiToken;
        String phoneNumberId = envWhatsAppPhoneNumberId;
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
                }
            }
        } catch (Exception e) {
            log.warn("[WhatsApp Notification] Failed to read dynamic database settings: {}", e.getMessage());
        }

        if (!isEnabled || apiToken == null || apiToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            return;
        }

        Map<String, Object> shippingAddress = order.getShippingAddress();
        String customerName = "Valued Customer";
        String customerPhone = null;

        if (shippingAddress != null) {
            for (String nameKey : List.of("full_name", "fullName", "name", "recipient_name")) {
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

        if (customerPhone == null || customerPhone.isBlank()) return;

        String cleanedPhone = cleanPhoneNumber(customerPhone);
        if (cleanedPhone == null || cleanedPhone.isBlank()) return;

        String trackingNum = order.getTrackingNumber() != null ? order.getTrackingNumber().trim() : order.getOrderNumber();

        log.info("[WhatsApp Shipped Notification] Dispatching order_shipped_v1 for Order #{}, Customer: {}, Phone: {}, Tracking: {}",
                order.getOrderNumber(), customerName, cleanedPhone, trackingNum);

        boolean dispatched = false;
        List<String> langCodes = List.of("en_US", "en", "en_GB", "hi", "hi_IN");

        for (String lang : langCodes) {
            if (dispatched) break;
            for (String apiVer : List.of("v20.0", "v25.0", "v18.0")) {
                if (dispatched) break;
                List<List<Map<String, Object>>> componentsOptions = List.of(
                    // Option 1: Body + Button (trackingNum parameter)
                    List.of(
                        Map.of(
                            "type", "body",
                            "parameters", List.of(
                                Map.of("type", "text", "text", customerName),
                                Map.of("type", "text", "text", order.getOrderNumber())
                            )
                        ),
                        Map.of(
                            "type", "button",
                            "sub_type", "url",
                            "index", "0",
                            "parameters", List.of(
                                Map.of("type", "text", "text", trackingNum)
                            )
                        )
                    ),
                    // Option 2: Body + Button (full URL parameter)
                    List.of(
                        Map.of(
                            "type", "body",
                            "parameters", List.of(
                                Map.of("type", "text", "text", customerName),
                                Map.of("type", "text", "text", order.getOrderNumber())
                            )
                        ),
                        Map.of(
                            "type", "button",
                            "sub_type", "url",
                            "index", "0",
                            "parameters", List.of(
                                Map.of("type", "text", "text", "https://t.17track.net/en#nums=" + trackingNum)
                            )
                        )
                    ),
                    // Option 3: Body only
                    List.of(
                        Map.of(
                            "type", "body",
                            "parameters", List.of(
                                Map.of("type", "text", "text", customerName),
                                Map.of("type", "text", "text", order.getOrderNumber())
                            )
                        )
                    )
                );

                for (List<Map<String, Object>> components : componentsOptions) {
                    if (dispatched) break;
                    try {
                        String url = "https://graph.facebook.com/" + apiVer + "/" + phoneNumberId + "/messages";

                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_JSON);
                        headers.setBearerAuth(apiToken);

                        Map<String, Object> body = new HashMap<>();
                        body.put("messaging_product", "whatsapp");
                        body.put("to", cleanedPhone);
                        body.put("type", "template");

                        Map<String, Object> template = new HashMap<>();
                        template.put("name", "order_shipped_v1");
                        template.put("language", Map.of("code", lang));
                        template.put("components", components);

                        body.put("template", template);

                        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                        restTemplate.postForEntity(url, request, String.class);
                        log.info("[WhatsApp Shipped API] Successfully dispatched order_shipped_v1 ({}) to {}", lang, cleanedPhone);
                        dispatched = true;
                    } catch (HttpStatusCodeException httpEx) {
                        log.warn("[WhatsApp Shipped API] order_shipped_v1 ({}) failed: {}", lang, httpEx.getResponseBodyAsString());
                    } catch (Exception e) {
                        log.warn("[WhatsApp Shipped API] order_shipped_v1 ({}) failed for {}: {}", lang, cleanedPhone, e.getMessage());
                    }
                }
            }
        }
    }
}
