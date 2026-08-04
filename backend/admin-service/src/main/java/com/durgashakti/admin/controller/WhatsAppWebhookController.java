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
                                    String userText = "";

                                    if ("text".equals(msgType) && msg.containsKey("text")) {
                                        Map<String, Object> textObj = (Map<String, Object>) msg.get("text");
                                        if (textObj != null && textObj.containsKey("body")) {
                                            userText = String.valueOf(textObj.get("body")).trim();
                                        }
                                    } else if ("button".equals(msgType) && msg.containsKey("button")) {
                                        Map<String, Object> btnObj = (Map<String, Object>) msg.get("button");
                                        if (btnObj != null && btnObj.containsKey("text")) {
                                            userText = String.valueOf(btnObj.get("text")).trim();
                                        }
                                    } else if ("interactive".equals(msgType) && msg.containsKey("interactive")) {
                                        Map<String, Object> interObj = (Map<String, Object>) msg.get("interactive");
                                        if (interObj != null) {
                                            if (interObj.containsKey("button_reply") && ((Map<String, Object>) interObj.get("button_reply")).containsKey("title")) {
                                                userText = String.valueOf(((Map<String, Object>) interObj.get("button_reply")).get("title")).trim();
                                            }
                                        }
                                    }

                                    log.info("[WhatsApp Incoming Message] From: {}, Type: {}, Content: '{}'", fromPhone, msgType, userText);

                                    // Process message through AI Decision Engine
                                    processIncomingUserMessage(fromPhone, userText);
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

    private void processIncomingUserMessage(String fromPhone, String userText) {
        String lower = userText.toLowerCase().trim();
        String replyText;

        if (lower.contains("rate experience") || lower.contains("rate")) {
            replyText = "Please rate your experience with DurgaShakti Foils from 1 to 5:\n\n" +
                        "Reply 5 for Excellent 🌟\n" +
                        "Reply 4 for Good 👍\n" +
                        "Reply 3 for Average 😐\n" +
                        "Reply 1 or 2 for Poor 💔";
        } else if ("5".equals(lower) || "4".equals(lower) || lower.contains("excellent") || lower.contains("great") || lower.contains("good")) {
            replyText = "Thank you so much for your 5-star rating! 🌟 We're thrilled you love the quality of DurgaShakti Foils!\n\n" +
                        "Explore our full range of premium wrapping products & exclusive deals here:\n" +
                        "https://durgashakti-foils.vercel.app";
        } else if ("1".equals(lower) || "2".equals(lower) || "3".equals(lower) || lower.contains("bad") || lower.contains("poor")) {
            replyText = "We sincerely apologize for not meeting your expectations! 😔\n\n" +
                        "Please tell us what went wrong (e.g. damaged box, wrong item, delivery delay). Our support team will review your message and contact you directly on WhatsApp to resolve it!\n\n" +
                        "For online returns & replacements, visit:\nhttps://durgashakti-foils.vercel.app/dashboard";
        } else if (lower.contains("report issue") || lower.contains("help") || lower.contains("damage") || lower.contains("broken")) {
            replyText = "Our DurgaShakti Support Team is ready to assist you! 🛠️\n\n" +
                        "• Please type your issue or attach a photo of the package.\n" +
                        "• To request an immediate return or replacement, visit:\nhttps://durgashakti-foils.vercel.app/dashboard\n\n" +
                        "An agent has been notified and will reply to this chat shortly!";
        } else if (lower.contains("returns") || lower.contains("policy") || lower.contains("refund")) {
            replyText = "DurgaShakti Foils Guarantee & Return Policy 📄:\n\n" +
                        "• Damaged or defective items are replaced free of cost.\n" +
                        "• Return requests can be initiated within 48 hours of delivery.\n" +
                        "• Wallet payments are refunded instantly to your DSF Wallet!\n\n" +
                        "Initiate a return online here:\nhttps://durgashakti-foils.vercel.app/dashboard";
        } else if (lower.contains("track") || lower.contains("where is my order") || lower.contains("status")) {
            replyText = "You can track your live shipment timeline, courier tracking numbers, and invoice details here:\n\n" +
                        "🌐 https://durgashakti-foils.vercel.app/dashboard";
        } else if (lower.contains("hi") || lower.contains("hello") || lower.contains("hey") || lower.contains("namaste")) {
            replyText = "Hello! 👋 Welcome to DurgaShakti Foils Support!\n\n" +
                        "How can we help you today? Reply with a option:\n\n" +
                        "1️⃣ Track My Order\n" +
                        "2️⃣ Product Catalog & Prices\n" +
                        "3️⃣ Returns & Replacements\n" +
                        "4️⃣ Talk to Support Agent";
        } else if ("1".equals(lower)) {
            replyText = "Track your order live here:\nhttps://durgashakti-foils.vercel.app/dashboard";
        } else if ("2".equals(lower) || lower.contains("product") || lower.contains("catalog") || lower.contains("price")) {
            replyText = "View our complete catalog of food-grade aluminum foils & wrapping sheets:\nhttps://durgashakti-foils.vercel.app";
        } else if ("3".equals(lower)) {
            replyText = "Initiate a return or replacement online:\nhttps://durgashakti-foils.vercel.app/dashboard";
        } else if ("4".equals(lower) || lower.contains("agent") || lower.contains("support")) {
            replyText = "Our customer support agent has been notified and will assist you right here on WhatsApp shortly! 👩‍💼";
        } else {
            replyText = "Thank you for contacting DurgaShakti Foils! 🙏\n\n" +
                        "We have received your message. Our customer support team will assist you shortly!\n\n" +
                        "Visit our official portal: https://durgashakti-foils.vercel.app";
        }

        sendCustomAutoReply(fromPhone, replyText);
    }

    private void sendCustomAutoReply(String recipientPhone, String replyText) {
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

            String cleanedTarget = WhatsAppNotificationService.cleanPhoneNumber(recipientPhone);
            if (cleanedTarget == null) return;

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", cleanedTarget);
            payload.put("type", "text");
            payload.put("text", Map.of("body", replyText));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(url, entity, String.class);
            log.info("[WhatsApp AI Auto-Reply] Successfully replied to {}: '{}'", recipientPhone, replyText.replace("\n", " "));

        } catch (Exception e) {
            log.error("[WhatsApp Auto-Reply Failed] Could not send reply to {}: {}", recipientPhone, e.getMessage());
        }
    }
}
