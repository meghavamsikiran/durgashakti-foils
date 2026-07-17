package com.durgashakti.common.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Calls Google Gemini's native REST API directly (no Spring AI dependency).
 * Uses primary key (GEMINI_FLASH_API_KEY) first, falls back to GEMINI_API_KEY.
 * Tries multiple model names to avoid per-model quota exhaustion.
 */
@Slf4j
@Service
public class GeminiFailoverService {

    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    // Model fallback chain — try each model in order until one works
    private static final String[] MODEL_CHAIN = {
        "gemini-2.0-flash",           // Standard model
        "gemini-1.5-flash",           // Stable 1.5 flash
        "gemini-1.5-flash-8b",        // High throughput lightweight 1.5 model
    };

    private final String primaryApiKey;
    private final String fallbackApiKey;

    public GeminiFailoverService() {
        this.primaryApiKey = System.getenv("GEMINI_FLASH_API_KEY");
        this.fallbackApiKey = System.getenv("GEMINI_API_KEY");

        if (primaryApiKey == null || primaryApiKey.isBlank()) {
            log.warn("⚠️ GEMINI_FLASH_API_KEY is NOT SET! AI Chat primary model will not work.");
        } else {
            log.info("✅ GEMINI_FLASH_API_KEY loaded (length={})", primaryApiKey.length());
        }
        if (fallbackApiKey == null || fallbackApiKey.isBlank()) {
            log.warn("⚠️ GEMINI_API_KEY is NOT SET! AI Chat fallback model will not work.");
        } else {
            log.info("✅ GEMINI_API_KEY loaded (length={})", fallbackApiKey.length());
        }
    }

    /**
     * Sends a chat message to Gemini with multi-model + multi-key failover.
     * Tries each model in the MODEL_CHAIN with the primary key first,
     * then repeats with the fallback key if all primary attempts fail.
     */
    public String chat(String systemPrompt, String userMessage) {
        String lastError = null;

        // Try primary API key with all models
        if (primaryApiKey != null && !primaryApiKey.isBlank()) {
            for (String model : MODEL_CHAIN) {
                try {
                    log.info("Trying model '{}' with primary API key...", model);
                    String result = callGeminiApi(primaryApiKey, model, systemPrompt, userMessage);
                    log.info("✅ Model '{}' responded successfully with primary key.", model);
                    return result;
                } catch (Exception e) {
                    lastError = e.getMessage();
                    if (isQuotaExhausted(e)) {
                        log.warn("Model '{}' quota exhausted with primary key. Trying next model...", model);
                    } else {
                        log.warn("Model '{}' failed with primary key: {}. Trying next...", model, e.getMessage());
                    }
                }
            }
        }

        // Try fallback API key with all models
        if (fallbackApiKey != null && !fallbackApiKey.isBlank() 
                && !fallbackApiKey.equals(primaryApiKey)) {
            for (String model : MODEL_CHAIN) {
                try {
                    log.info("Trying model '{}' with fallback API key...", model);
                    String result = callGeminiApi(fallbackApiKey, model, systemPrompt, userMessage);
                    log.info("✅ Model '{}' responded successfully with fallback key.", model);
                    return result;
                } catch (Exception e) {
                    lastError = e.getMessage();
                    if (isQuotaExhausted(e)) {
                        log.warn("Model '{}' quota exhausted with fallback key. Trying next model...", model);
                    } else {
                        log.warn("Model '{}' failed with fallback key: {}. Trying next...", model, e.getMessage());
                    }
                }
            }
        }

        // All attempts failed
        String errorMsg = "All Gemini API attempts exhausted. Last error: " + lastError;
        log.error("FATAL: {}", errorMsg);
        throw new RuntimeException(errorMsg);
    }

    private boolean isQuotaExhausted(Exception e) {
        String msg = e.getMessage();
        return msg != null && (msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("quota"));
    }

    private String callGeminiApi(String apiKey, String model, String systemPrompt, String userMessage) throws Exception {
        // Build native Gemini API request body
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

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 429) {
            // Quota exhausted — throw specific error so failover can try next model
            throw new RuntimeException("Gemini API quota exhausted (HTTP 429) for model '" + model + "'");
        }

        if (response.statusCode() != 200) {
            log.error("Gemini API returned HTTP {} for model '{}': {}", response.statusCode(), model, response.body());
            throw new RuntimeException("Gemini API error (HTTP " + response.statusCode() + ") for model '" + model + "': " + truncate(response.body(), 200));
        }

        // Parse the response
        JsonNode root = objectMapper.readTree(response.body());
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode content = candidates.get(0).path("content").path("parts");
            if (content.isArray() && content.size() > 0) {
                return content.get(0).path("text").asText();
            }
        }

        log.warn("Gemini API returned unexpected response structure for model '{}': {}", model, truncate(response.body(), 300));
        throw new RuntimeException("Unexpected Gemini API response format for model '" + model + "'");
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "null";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...(truncated)";
    }
}
