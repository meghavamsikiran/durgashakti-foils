package com.durgashakti.common.config;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AiClientConfig {

    private static final String GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

    @Bean
    @Primary
    @Qualifier("geminiFlashClient")
    public OpenAiChatModel geminiFlashClient() {
        String apiKey = System.getenv("GEMINI_FLASH_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = "dummy_key_to_prevent_startup_failure";
        }
        
        OpenAiApi openAiApi = new OpenAiApi(GEMINI_OPENAI_BASE_URL, apiKey);
        
        return new OpenAiChatModel(openAiApi, OpenAiChatOptions.builder()
                .withModel("gemini-1.5-flash")
                .withTemperature(0.7F)
                .build());
    }

    @Bean
    @Qualifier("geminiApiClient")
    public OpenAiChatModel geminiApiClient() {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = "dummy_key_to_prevent_startup_failure";
        }
        
        OpenAiApi openAiApi = new OpenAiApi(GEMINI_OPENAI_BASE_URL, apiKey);
        
        return new OpenAiChatModel(openAiApi, OpenAiChatOptions.builder()
                .withModel("gemini-1.5-pro")
                .withTemperature(0.7F)
                .build());
    }
}
