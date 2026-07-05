package com.durgashakti.common.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class GeminiFailoverService {

    private final OpenAiChatModel primaryModel;
    private final OpenAiChatModel fallbackModel;

    public GeminiFailoverService(
            @Qualifier("geminiFlashClient") OpenAiChatModel primaryModel,
            @Qualifier("geminiApiClient") OpenAiChatModel fallbackModel) {
        this.primaryModel = primaryModel;
        this.fallbackModel = fallbackModel;
    }

    public ChatResponse callWithFailover(Prompt prompt) {
        try {
            log.info("Executing chat query on primary Gemini Flash model...");
            return primaryModel.call(prompt);
        } catch (Exception e) {
            log.warn("Primary Gemini Flash model failed (Error: {}). Initiating fallback to Gemini API model...", e.getMessage());
            try {
                return fallbackModel.call(prompt);
            } catch (Exception fallbackEx) {
                log.error("Fatal: Both primary and fallback Gemini APIs failed! Primary error: {}, Fallback error: {}", 
                    e.getMessage(), fallbackEx.getMessage(), fallbackEx);
                throw fallbackEx;
            }
        }
    }
}
