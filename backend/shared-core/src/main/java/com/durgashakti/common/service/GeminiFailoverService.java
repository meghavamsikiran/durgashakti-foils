package com.durgashakti.common.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@Service
public class GeminiFailoverService {

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

        // All providers exhausted
        String errorSummary = String.join(" | ", errors);
        log.error("FATAL: All AI providers exhausted. Errors: {}", errorSummary);
        throw new RuntimeException("All AI providers exhausted. " + errorSummary);
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
