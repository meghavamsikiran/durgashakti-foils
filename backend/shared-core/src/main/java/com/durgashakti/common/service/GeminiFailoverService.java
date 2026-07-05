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
 */
@Slf4j
@Service
public class GeminiFailoverService {

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

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
     * Sends a chat message to Gemini with failover.
     * @param systemPrompt the system instruction text
     * @param userMessage the user's message text
     * @return Gemini's text response
     */
    public String chat(String systemPrompt, String userMessage) {
        // Try primary key first
        if (primaryApiKey != null && !primaryApiKey.isBlank()) {
            try {
                log.info("Executing chat query on primary Gemini model (GEMINI_FLASH_API_KEY)...");
                String result = callGeminiApi(primaryApiKey, systemPrompt, userMessage);
                log.info("Primary Gemini model responded successfully.");
                return result;
            } catch (Exception e) {
                log.warn("Primary Gemini model failed: {}. Attempting fallback...", e.getMessage());
            }
        }

        // Try fallback key
        if (fallbackApiKey != null && !fallbackApiKey.isBlank()) {
            try {
                log.info("Executing chat query on fallback Gemini model (GEMINI_API_KEY)...");
                String result = callGeminiApi(fallbackApiKey, systemPrompt, userMessage);
                log.info("Fallback Gemini model responded successfully.");
                return result;
            } catch (Exception e) {
                log.error("FATAL: Both Gemini API keys failed! Fallback error: {}", e.getMessage(), e);
                throw new RuntimeException("Both Gemini API calls failed: " + e.getMessage(), e);
            }
        }

        throw new RuntimeException("No valid Gemini API keys configured. Set GEMINI_FLASH_API_KEY or GEMINI_API_KEY environment variables.");
    }

    private String callGeminiApi(String apiKey, String systemPrompt, String userMessage) throws Exception {
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
        String url = GEMINI_API_URL + "?key=" + apiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("Gemini API returned HTTP {}: {}", response.statusCode(), response.body());
            throw new RuntimeException("Gemini API error (HTTP " + response.statusCode() + "): " + response.body());
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

        log.warn("Gemini API returned unexpected response structure: {}", response.body());
        throw new RuntimeException("Unexpected Gemini API response format");
    }
}
