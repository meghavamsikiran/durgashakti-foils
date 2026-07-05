package com.durgashakti.common.config;

/**
 * AI Client configuration.
 * 
 * NOTE: Gemini API calls are now made directly via REST in GeminiFailoverService.
 * No Spring AI OpenAiChatModel beans are needed anymore.
 * The GEMINI_FLASH_API_KEY and GEMINI_API_KEY environment variables are read
 * directly by GeminiFailoverService at construction time.
 */
public class AiClientConfig {
    // Intentionally empty — Gemini API is called directly via native REST.
    // This class is retained to avoid breaking any component scans.
}
