package com.durgashakti.order.controller;

import com.durgashakti.common.entity.ChatMessage;
import com.durgashakti.common.service.GeminiFailoverService;
import com.durgashakti.order.repository.ChatMessageRepository;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class AiChatController {

  private final GeminiFailoverService failoverService;
  private final ChatMessageRepository chatMessageRepository;

  public AiChatController(GeminiFailoverService failoverService, ChatMessageRepository chatMessageRepository) {
    this.failoverService = failoverService;
    this.chatMessageRepository = chatMessageRepository;
  }

  @GetMapping("/ai-chat/history")
  public ResponseEntity<List<Map<String, String>>> getHistory(
      @RequestParam(name = "sessionId") String sessionId,
      Authentication authentication) {
      
      List<ChatMessage> chatLogs;
      if (authentication != null && authentication.getPrincipal() != null) {
          try {
              UUID userId = UUID.fromString((String) authentication.getPrincipal());
              chatLogs = chatMessageRepository.findByUserIdOrderByCreatedAtAsc(userId);
              // Fallback to sessionId if no user history found yet (e.g. they just logged in)
              if (chatLogs.isEmpty() && sessionId != null && !sessionId.isBlank()) {
                  chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
                  // Link guest history to their account
                  for (ChatMessage log : chatLogs) {
                      if (log.getUserId() == null) {
                          log.setUserId(userId);
                          chatMessageRepository.save(log);
                      }
                  }
              }
          } catch (Exception e) {
              chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
          }
      } else {
          chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
      }

      List<Map<String, String>> response = chatLogs.stream().map(log -> Map.of(
          "sender", log.getSender(),
          "text", log.getText()
      )).collect(Collectors.toList());

      return ResponseEntity.ok(response);
  }

  @PostMapping("/ai-chat")
  public ResponseEntity<Map<String, String>> chat(
      @RequestBody Map<String, String> request,
      Authentication authentication) {
      
    String userMessageStr = request.get("message");
    String sessionId = request.get("sessionId");
    if (sessionId == null || sessionId.isBlank()) {
        sessionId = "anonymous_session";
    }

    UUID authenticatedUserId = null;
    if (authentication != null && authentication.getPrincipal() != null) {
        try {
            authenticatedUserId = UUID.fromString((String) authentication.getPrincipal());
        } catch (Exception ignored) {}
    }

    // Save User message to history
    ChatMessage userLog = new ChatMessage(authenticatedUserId, sessionId, "user", userMessageStr);
    chatMessageRepository.save(userLog);

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

    // Save Bot message to history
    ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", aiResponse);
    chatMessageRepository.save(botLog);

    return ResponseEntity.ok(Map.of("response", aiResponse));
  }
}
