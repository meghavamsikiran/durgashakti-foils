package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Setting;
import com.durgashakti.admin.repository.AdminSettingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    private static final String VERIFY_TOKEN = "durgashakti_whatsapp_token_2026";
    private final AdminSettingRepository settingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public WhatsAppWebhookController(AdminSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    /**
     * Meta Webhook Verification endpoint (GET).
     * Called by Meta when configuring the Callback URL.
     */
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.verify_token", required = false) String token,
            @RequestParam(value = "hub.challenge", required = false) String challenge) {

        log.info("[WhatsApp Webhook Verification] mode={}, token={}, challenge={}", mode, token, challenge);

        if ("subscribe".equals(mode) && VERIFY_TOKEN.equals(token)) {
            log.info("[WhatsApp Webhook Verification] Verified successfully!");
            return ResponseEntity.ok(challenge);
        } else {
            log.warn("[WhatsApp Webhook Verification] Verification failed! Token mismatch.");
            return ResponseEntity.status(403).body("Verification token mismatch");
        }
    }

    /**
     * Meta Webhook Event Notification endpoint (POST).
     * Called by Meta whenever a customer sends a message or taps a button.
     */
    @PostMapping("/webhook")
    @SuppressWarnings("unchecked")
    public ResponseEntity<String> handleIncomingWebhook(@RequestBody Map<String, Object> body) {
        try {
            log.info("[WhatsApp Incoming Webhook] Received payload: {}", body);

            // Extract message details from Meta payload
            if (body.containsKey("entry")) {
                List<Map<String, Object>> entries = (List<Map<String, Object>>) body.get("entry");
                for (Map<String, Object> entry : entries) {
                    List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get("changes");
                    if (changes != null) {
                        for (Map<String, Object> change : changes) {
                            Map<String, Object> value = (Map<String, Object>) change.get("value");
                            if (value != null && value.containsKey("messages")) {
                                List<Map<String, Object>> messages = (List<Map<String, Object>>) value.get("messages");
                                for (Map<String, Object> msg : messages) {
                                    String fromPhone = String.valueOf(msg.get("from"));
                                    String msgType = String.valueOf(msg.get("type"));

                                    log.info("[WhatsApp Incoming Message] From: {}, Type: {}", fromPhone, msgType);

                                    // Auto-reply to customer
                                    sendAutoReply(fromPhone);
                                }
                            }
                        }
                    }
                }
            }
            return ResponseEntity.ok("EVENT_RECEIVED");
        } catch (Exception e) {
            log.error("[WhatsApp Webhook] Error processing incoming payload", e);
            return ResponseEntity.ok("EVENT_RECEIVED"); // Always return 200 OK to Meta
        }
    }

    private void sendAutoReply(String recipientPhone) {
        try {
            String apiToken = null;
            String phoneNumberId = null;

            Optional<Setting> settingOpt = settingRepository.findById("whatsapp_ai_feedback");
            if (settingOpt.isPresent()) {
                Map<String, Object> val = settingOpt.get().getValue();
                if (val != null) {
                    Object tok = val.get("apiToken");
                    Object pid = val.get("phoneNumberId");
                    apiToken = tok != null ? tok.toString().trim() : null;
                    phoneNumberId = pid != null ? pid.toString().trim() : null;
                }
            }

            if (apiToken == null || phoneNumberId == null) return;

            String url = "https://graph.facebook.com/v20.0/" + phoneNumberId + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken);

            String replyText = "Thank you for contacting DurgaShakti Foils! 🙏\n\nWe have received your message/feedback. Our customer support team will assist you shortly!\n\nFor urgent queries, visit: https://durgashakti-foils.vercel.app";

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", recipientPhone);
            payload.put("type", "text");
            payload.put("text", Map.of("body", replyText));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(url, entity, String.class);
            log.info("[WhatsApp Auto-Reply] Successfully replied to {}", recipientPhone);

        } catch (Exception e) {
            log.error("[WhatsApp Auto-Reply Failed] Could not send reply to {}: {}", recipientPhone, e.getMessage());
        }
    }
}
