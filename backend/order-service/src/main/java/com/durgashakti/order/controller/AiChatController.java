package com.durgashakti.order.controller;

import com.durgashakti.common.entity.ChatMessage;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.service.GeminiFailoverService;
import com.durgashakti.order.repository.ChatMessageRepository;
import com.durgashakti.order.repository.OrderRepository;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class AiChatController {

  private final GeminiFailoverService failoverService;
  private final ChatMessageRepository chatMessageRepository;
  private final OrderRepository orderRepository;

  public AiChatController(
      GeminiFailoverService failoverService, 
      ChatMessageRepository chatMessageRepository,
      OrderRepository orderRepository) {
    this.failoverService = failoverService;
    this.chatMessageRepository = chatMessageRepository;
    this.orderRepository = orderRepository;
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
              if (chatLogs.isEmpty() && sessionId != null && !sessionId.isBlank()) {
                  chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
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
        
        CRITICAL RULE FOR ORDER TRACKING:
        If the user asks about order status, tracking, or details of a specific order number (e.g. OD-YYYYMMDD-XXXXX), you must extract the order number and reply EXACTLY in this format:
        [LOOKUP_ORDER: <order-number>]
        Do not write any introductory or trailing text. Just return the bracketed lookup command.
        """;

    SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemText);
    Message systemMessage = systemPromptTemplate.createMessage();
    UserMessage userMessage = new UserMessage(userMessageStr);

    OpenAiChatOptions chatOptions = OpenAiChatOptions.builder().build(); // No tool-calling (to prevent OpenAI API translation errors)
    Prompt prompt = new Prompt(List.of(systemMessage, userMessage), chatOptions);
    
    String aiResponse = failoverService.callWithFailover(prompt).getResult().getOutput().getContent();

    // Check if the AI requested an order lookup
    if (aiResponse != null && aiResponse.contains("[LOOKUP_ORDER:")) {
        Pattern pattern = Pattern.compile("\\[LOOKUP_ORDER:\\s*([^\\]]+)\\]");
        Matcher matcher = pattern.matcher(aiResponse);
        if (matcher.find()) {
            String orderNum = matcher.group(1).trim();
            Order order = orderRepository.findByOrderNumber(orderNum).orElse(null);
            if (order == null) {
                // Fallback search
                String cleanNum = orderNum.replaceAll("[^0-9]", "");
                if (!cleanNum.isEmpty()) {
                    order = orderRepository.findAll().stream()
                        .filter(o -> o.getOrderNumber() != null && o.getOrderNumber().contains(cleanNum))
                        .findFirst().orElse(null);
                }
            }

            String liveInfoPrompt;
            if (order != null) {
                liveInfoPrompt = String.format(
                    "System: The order status is %s, payment status is %s, tracking number is %s, and it contains these items: %s. " +
                    "Please present this information nicely and professionally to the user.",
                    order.getOrderStatus(),
                    order.getPaymentStatus(),
                    order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not Shipped Yet",
                    order.getItems()
                );
            } else {
                liveInfoPrompt = "System: Order " + orderNum + " was not found in the database. Please inform the user politely.";
            }

            UserMessage systemFeedbackMessage = new UserMessage(liveInfoPrompt);
            Prompt finalPrompt = new Prompt(List.of(systemMessage, userMessage, systemFeedbackMessage), chatOptions);
            aiResponse = failoverService.callWithFailover(finalPrompt).getResult().getOutput().getContent();
        }
    }

    // Save Bot message to history
    ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", aiResponse);
    chatMessageRepository.save(botLog);

    return ResponseEntity.ok(Map.of("response", aiResponse));
  }
}
