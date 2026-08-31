package com.durgashakti.common.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Multi-provider AI Chat service with automatic failover.
 * 
 * Provider priority:
 *   1. Google Gemini (GEMINI_FLASH_API_KEY → GEMINI_API_KEY)
 *   2. Groq (GROQ_API_KEY)
 *   3. xAI / Grok (XAI_API_KEY or GROK_API_KEY)
 * 
 * Each provider is tried with multiple models. If all providers fail,
 * an exception is thrown and the controller returns a friendly message.
 */
@Service
public class GeminiFailoverService {
    private static final Logger log = LoggerFactory.getLogger(GeminiFailoverService.class);

    // Cache-buster to trigger fresh Render compilation without build cache: v2
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String GROQ_API_BASE = "https://api.groq.com/openai/v1/chat/completions";
    private static final String XAI_API_BASE = "https://api.x.ai/v1/chat/completions";

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    // Gemini model chain
    private static final String[] GEMINI_MODELS = {
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
    };

    // Groq model chain
    private static final String[] GROQ_MODELS = {
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
    };

    // xAI/Grok model chain
    private static final String[] XAI_MODELS = {
        "grok-3-mini-fast",
        "grok-3-mini",
        "grok-2-latest",
    };

    private final String geminiPrimaryKey;
    private final String geminiFallbackKey;
    private final String groqApiKey;
    private final String xaiApiKey;

    public GeminiFailoverService(
            @Value("${GEMINI_FLASH_API_KEY:}") String geminiFlashKey,
            @Value("${GEMINI_API_KEY:}") String geminiKey,
            @Value("${GROQ_API_KEY:}") String groqKey,
            @Value("${XAI_API_KEY:}") String xaiKey) {

        // Also check System.getenv as a secondary source
        this.geminiPrimaryKey = resolveKey(geminiFlashKey, "GEMINI_FLASH_API_KEY");
        this.geminiFallbackKey = resolveKey(geminiKey, "GEMINI_API_KEY");
        this.groqApiKey = resolveKey(groqKey, "GROQ_API_KEY");

        // xAI key can be under XAI_API_KEY or GROK_API_KEY
        String resolvedXai = resolveKey(xaiKey, "XAI_API_KEY");
        if (isBlank(resolvedXai)) {
            resolvedXai = resolveKey("", "GROK_API_KEY");
        }
        this.xaiApiKey = resolvedXai;

        // Startup diagnostics
        logKeyStatus("GEMINI_FLASH_API_KEY", geminiPrimaryKey);
        logKeyStatus("GEMINI_API_KEY", geminiFallbackKey);
        logKeyStatus("GROQ_API_KEY", groqApiKey);
        logKeyStatus("XAI_API_KEY / GROK_API_KEY", xaiApiKey);
    }

    private String resolveKey(String springValue, String envName) {
        if (!isBlank(springValue)) return springValue.trim();
        String env = System.getenv(envName);
        return env != null ? env.trim() : "";
    }

    private void logKeyStatus(String name, String key) {
        if (isBlank(key)) {
            log.warn("⚠️ {} is NOT SET", name);
        } else {
            log.info("✅ {} loaded (length={}, prefix={})", name, key.length(),
                    key.length() > 4 ? key.substring(0, 4) + "..." : "****");
        }
    }

    /**
     * Sends a chat message with multi-provider failover.
     * Tries Gemini → Groq → xAI/Grok in order.
     */
    public String chat(String systemPrompt, String userMessage) {
        List<String> errors = new ArrayList<>();

        // === Provider 1: Google Gemini ===
        String result = tryGemini(geminiPrimaryKey, "primary", systemPrompt, userMessage, errors);
        if (result != null) return result;

        if (!isBlank(geminiFallbackKey) && !geminiFallbackKey.equals(geminiPrimaryKey)) {
            result = tryGemini(geminiFallbackKey, "fallback", systemPrompt, userMessage, errors);
            if (result != null) return result;
        }

        // === Provider 2: Groq ===
        if (!isBlank(groqApiKey)) {
            result = tryOpenAiCompatible(GROQ_API_BASE, groqApiKey, GROQ_MODELS, "Groq",
                    systemPrompt, userMessage, errors);
            if (result != null) return result;
        }

        // === Provider 3: xAI / Grok ===
        if (!isBlank(xaiApiKey)) {
            result = tryOpenAiCompatible(XAI_API_BASE, xaiApiKey, XAI_MODELS, "xAI/Grok",
                    systemPrompt, userMessage, errors);
            if (result != null) return result;
        }

        // All providers exhausted — return intelligent rule-based fallback response
        String errorSummary = String.join(" | ", errors);
        log.warn("AI providers unavailable ({}) — returning rule-based fallback response.", errorSummary);
        return generateRuleBasedResponse(userMessage);
    }

    private String generateRuleBasedResponse(String userMessage) {
        if (userMessage == null) return "Hello! How can I assist you with DurgaShakti Foils today?";
        
        // 1. If this is a resolver system context prompt, extract and return clean factual prose
        if (userMessage.contains("System context:")) {
            String contextPart = userMessage.substring(userMessage.indexOf("System context:") + 15).trim();
            return contextPart;
        }

        String msgLower = userMessage.toLowerCase();

        // 2. Check for explicit Order / Ticket ID (e.g. OD-20260831-04770367, OD-TKT-123456)
        java.util.regex.Matcher orderIdMatcher = java.util.regex.Pattern.compile("(?i)OD-[A-Z0-9-]+").matcher(userMessage);
        if (orderIdMatcher.find()) {
            String foundNum = orderIdMatcher.group(0).toUpperCase();
            if (foundNum.startsWith("OD-TKT-")) {
                return "[LOOKUP_TICKET: " + foundNum + "]";
            }
            return "[LOOKUP_ORDER: " + foundNum + "]";
        }

        // 3. General order / tracking inquiries without explicit ID
        if (msgLower.contains("track") || msgLower.contains("order status") || msgLower.contains("where is my order") || msgLower.contains("check order")) {
            return "To check your order status, please provide your Order Number (e.g. OD-20260831-04770367). You can also view details in your Order Dashboard.";
        }

        // 4. Ticket / support inquiry without explicit ID
        if (msgLower.contains("ticket") || msgLower.contains("support case") || msgLower.contains("inquiry status")) {
            return "Please provide your Ticket ID (e.g. OD-TKT-123456) to check the status of your support inquiry.";
        }

        // 5. DSF Wallet inquiry
        if (msgLower.contains("wallet") || msgLower.contains("dsf wallet") || (msgLower.contains("refund") && (msgLower.contains("balance") || msgLower.contains("money") || msgLower.contains("funds")))) {
            return "[LOOKUP_WALLET]";
        }

        // 6. Product specs inquiries
        if (msgLower.contains("micron") || msgLower.contains("foil") || msgLower.contains("thick") || msgLower.contains("roll")) {
            return "DurgaShakti Foils offers premium food-grade aluminium foils in 11 Micron (Standard), 18 Micron (Heavy Duty), and 25 Micron (Super Heavy Duty) options across 9m, 18m, and 72m roll lengths. How can I help you choose?";
        }

        // 7. General greeting or fallback
        if (msgLower.contains("hi") || msgLower.contains("hello") || msgLower.contains("hey")) {
            return "Hello! Welcome to DurgaShakti Foils. How can I assist you with our products, orders, or DSF Wallet today?";
        }

        return "Thank you for reaching out to DurgaShakti Foils! How can I assist you with our food wrapping products, orders, or refunds today?";
    }

    // ─── Gemini (native REST API) ───────────────────────────────────────

    private String tryGemini(String apiKey, String keyLabel, String systemPrompt,
                             String userMessage, List<String> errors) {
        if (isBlank(apiKey)) return null;

        for (String model : GEMINI_MODELS) {
            try {
                log.info("[Gemini] Trying model '{}' with {} key...", model, keyLabel);
                String res = callGeminiApi(apiKey, model, systemPrompt, userMessage);
                log.info("[Gemini] ✅ Model '{}' responded successfully with {} key.", model, keyLabel);
                return res;
            } catch (Exception e) {
                String err = "[Gemini/" + model + "/" + keyLabel + "] " + e.getMessage();
                errors.add(err);
                log.warn("{}", err);
            }
        }
        return null;
    }

    private String callGeminiApi(String apiKey, String model, String systemPrompt,
                                  String userMessage) throws Exception {
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", userMessage)))
            ),
            "systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemPrompt))
            ),
            "generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 1024
            )
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);
        String url = GEMINI_API_BASE + model + ":generateContent?key=" + apiKey;

        HttpResponse<String> response = sendPost(url, jsonBody, null);

        if (response.statusCode() == 429) {
            throw new RuntimeException("Quota exhausted (HTTP 429)");
        }
        if (response.statusCode() != 200) {
            log.error("[Gemini] HTTP {} for '{}': {}", response.statusCode(), model,
                    truncate(response.body(), 300));
            throw new RuntimeException("HTTP " + response.statusCode() + ": " +
                    truncate(response.body(), 200));
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                return parts.get(0).path("text").asText();
            }
        }

        throw new RuntimeException("Unexpected response format: " + truncate(response.body(), 200));
    }

    // ─── OpenAI-compatible API (Groq, xAI/Grok) ────────────────────────

    private String tryOpenAiCompatible(String baseUrl, String apiKey, String[] models,
                                        String providerName, String systemPrompt,
                                        String userMessage, List<String> errors) {
        for (String model : models) {
            try {
                log.info("[{}] Trying model '{}'...", providerName, model);
                String res = callOpenAiCompatible(baseUrl, apiKey, model, systemPrompt, userMessage);
                log.info("[{}] ✅ Model '{}' responded successfully.", providerName, model);
                return res;
            } catch (Exception e) {
                String err = "[" + providerName + "/" + model + "] " + e.getMessage();
                errors.add(err);
                log.warn("{}", err);
            }
        }
        return null;
    }

    private String callOpenAiCompatible(String baseUrl, String apiKey, String model,
                                         String systemPrompt, String userMessage) throws Exception {
        Map<String, Object> requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userMessage)
            ),
            "temperature", 0.7,
            "max_tokens", 1024
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        HttpResponse<String> response = sendPost(baseUrl, jsonBody, "Bearer " + apiKey);

        if (response.statusCode() == 429) {
            throw new RuntimeException("Rate limited (HTTP 429)");
        }
        if (response.statusCode() != 200) {
            log.error("[OpenAI-compat] HTTP {} for '{}': {}", response.statusCode(), model,
                    truncate(response.body(), 300));
            throw new RuntimeException("HTTP " + response.statusCode() + ": " +
                    truncate(response.body(), 200));
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode choices = root.path("choices");
        if (choices.isArray() && choices.size() > 0) {
            String content = choices.get(0).path("message").path("content").asText();
            if (content != null && !content.isEmpty()) {
                return content;
            }
        }

        throw new RuntimeException("Unexpected response format: " + truncate(response.body(), 200));
    }

    // ─── HTTP helper ────────────────────────────────────────────────────

    private HttpResponse<String> sendPost(String url, String jsonBody, String authHeader)
            throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));

        if (authHeader != null) {
            builder.header("Authorization", authHeader);
        }

        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    // ─── Utilities ──────────────────────────────────────────────────────

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "null";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...(truncated)";
    }
}
