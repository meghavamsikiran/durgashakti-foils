package com.durgashakti.order.controller;

import com.durgashakti.common.service.GeminiFailoverService;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class AiChatController {

  private final GeminiFailoverService failoverService;

  public AiChatController(GeminiFailoverService failoverService) {
    this.failoverService = failoverService;
  }

  @PostMapping("/ai-chat")
  public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
    String userMessageStr = request.get("message");

    String systemText = """
        You are the official AI Assistant for DurgaShakti Foils.
        Our brand specializes in premium food-grade aluminium foils:
        - Standard Foil (11 microns): Perfect for wrapping sandwiches, rotis, and general food storage.
        - Heavy Duty Foil (18 microns): Best for commercial kitchens, grilling, and roasting.
        Be helpful, professional, and cross-promote appropriate product lengths (6m, 9m, 24m, 72m) based on customer requirements.
        
        You have access to getOrderInfo tool/function to lookup live order tracking details for customers.
        If the customer asks about order status, tracking, or items, call getOrderInfo by passing their order number.
        """;

    SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemText);
    Message systemMessage = systemPromptTemplate.createMessage();
    UserMessage userMessage = new UserMessage(userMessageStr);

    OpenAiChatOptions chatOptions = OpenAiChatOptions.builder()
        .withFunctions(java.util.Set.of("getOrderInfo")) // Maps to getOrderInfo bean
        .build();

    Prompt prompt = new Prompt(List.of(systemMessage, userMessage), chatOptions);
    String aiResponse = failoverService.callWithFailover(prompt).getResult().getOutput().getContent();

    return ResponseEntity.ok(Map.of("response", aiResponse));
  }
}
