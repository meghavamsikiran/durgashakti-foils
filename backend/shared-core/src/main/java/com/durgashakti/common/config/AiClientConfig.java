package com.durgashakti.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Slf4j
@Configuration
public class AiClientConfig {

    private static final String GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

    @Bean
    @Primary
    @Qualifier("geminiFlashClient")
    public OpenAiChatModel geminiFlashClient() {
        String apiKey = System.getenv("GEMINI_FLASH_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ GEMINI_FLASH_API_KEY environment variable is NOT SET! AI Chat will NOT work. Set this in Render Environment Variables.");
            apiKey = "dummy_key_to_prevent_startup_failure";
        } else {
            log.info("✅ GEMINI_FLASH_API_KEY loaded successfully (length={})", apiKey.length());
        }
        
        OpenAiApi openAiApi = new OpenAiApi(GEMINI_OPENAI_BASE_URL, apiKey);
        
        return new OpenAiChatModel(openAiApi, OpenAiChatOptions.builder()
                .withModel("gemini-2.0-flash")
                .withTemperature(0.7F)
                .build());
    }

    @Bean
    @Qualifier("geminiApiClient")
    public OpenAiChatModel geminiApiClient() {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ GEMINI_API_KEY environment variable is NOT SET! Fallback AI Chat will NOT work. Set this in Render Environment Variables.");
            apiKey = "dummy_key_to_prevent_startup_failure";
        } else {
            log.info("✅ GEMINI_API_KEY loaded successfully (length={})", apiKey.length());
        }
        
        OpenAiApi openAiApi = new OpenAiApi(GEMINI_OPENAI_BASE_URL, apiKey);
        
        return new OpenAiChatModel(openAiApi, OpenAiChatOptions.builder()
                .withModel("gemini-2.0-flash")
                .withTemperature(0.7F)
                .build());
    }
}
