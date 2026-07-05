package com.durgashakti.order.controller;

import com.durgashakti.common.entity.ChatMessage;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.service.GeminiFailoverService;
import com.durgashakti.order.repository.ChatMessageRepository;
import com.durgashakti.order.repository.OrderServiceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/orders")
public class AiChatController {

  private final GeminiFailoverService failoverService;
  private final ChatMessageRepository chatMessageRepository;
  private final OrderServiceRepository orderRepository;

  private static final String SYSTEM_PROMPT = """
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

  public AiChatController(
      GeminiFailoverService failoverService, 
      ChatMessageRepository chatMessageRepository,
      OrderServiceRepository orderRepository) {
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
                  for (ChatMessage chatLog : chatLogs) {
                      if (chatLog.getUserId() == null) {
                          chatLog.setUserId(userId);
                          chatMessageRepository.save(chatLog);
                      }
                  }
              }
          } catch (Exception e) {
              chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
          }
      } else {
          chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
      }

      List<Map<String, String>> response = chatLogs.stream().map(chatLog -> Map.of(
          "sender", chatLog.getSender(),
          "text", chatLog.getText()
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

    String aiResponse;

    try {
      // Call Gemini directly via native REST API
      aiResponse = failoverService.chat(SYSTEM_PROMPT, userMessageStr);

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

              String orderContext;
              if (order != null) {
                  orderContext = String.format(
                      "The user asked: %s\nSystem context: The order status is %s, payment status is %s, tracking number is %s, and it contains these items: %s. " +
                      "Please present this information nicely and professionally to the user.",
                      userMessageStr,
                      order.getOrderStatus(),
                      order.getPaymentStatus(),
                      order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not Shipped Yet",
                      order.getItems()
                  );
              } else {
                  orderContext = "The user asked: " + userMessageStr + "\nSystem context: Order " + orderNum + " was not found in the database. Please inform the user politely.";
              }

              try {
                  aiResponse = failoverService.chat(SYSTEM_PROMPT, orderContext);
              } catch (Exception orderLookupEx) {
                  log.warn("Gemini API failed during order lookup follow-up: {}", orderLookupEx.getMessage());
                  // Use the raw order data as fallback instead of crashing
                  if (order != null) {
                      aiResponse = String.format("Here's the status of your order %s:\n• Order Status: %s\n• Payment Status: %s\n• Tracking: %s",
                          orderNum, order.getOrderStatus(), order.getPaymentStatus(),
                          order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not shipped yet");
                  } else {
                      aiResponse = "I found your order number " + orderNum + " but couldn't locate it in our system. Please contact support for assistance.";
                  }
              }
          }
      }
    } catch (Exception e) {
        log.error("AI Chat service failed. Error: {}", e.getMessage(), e);
        aiResponse = "[DEBUG] AI service error: " + e.getMessage();
    }

    // Save Bot message to history
    ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", aiResponse);
    chatMessageRepository.save(botLog);

    return ResponseEntity.ok(Map.of("response", aiResponse));
  }
}
