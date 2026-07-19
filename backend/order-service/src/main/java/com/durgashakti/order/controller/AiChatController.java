package com.durgashakti.order.controller;

import com.durgashakti.common.entity.ChatMessage;
import com.durgashakti.common.entity.Contact;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.service.GeminiFailoverService;
import com.durgashakti.order.repository.ChatMessageRepository;
import com.durgashakti.order.repository.ContactOrderRepository;
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
  private final ContactOrderRepository contactRepository;

  private static final String SYSTEM_PROMPT = """
      You are the official AI Assistant for DurgaShakti Foils.
      Our brand specializes in premium food-grade aluminium foils:
      - Standard Foil (11 microns): Perfect for wrapping food.
      - Heavy Duty Foil (18 microns): Best for grilling/roasting.
      Be extremely polite, humble, and friendly.
      CRITICAL RULES:
      1. Always keep responses short and concise. Do NOT write more than 2-3 sentences.
      2. If the user asks about order status, tracking, or details of a specific order number (e.g. OD-YYYYMMDD-XXXXX), reply EXACTLY in this format:
         [LOOKUP_ORDER: <order-number>]
         Do not write any other text.
      3. If the user asks about a support ticket status or details (e.g. OD-TKT-XXXXXX), reply EXACTLY in this format:
         [LOOKUP_TICKET: <ticket-id>]
         Do not write any other text.
      """;

  private static final String RESOLVER_PROMPT = """
      You are the official AI Assistant for DurgaShakti Foils.
      Please present the status details of the requested order or support ticket to the customer politely, humbly, and supportively.
      Keep your answer extremely concise, polite, and helpful. Do not write more than 2-3 sentences.
      """;

  public AiChatController(
      GeminiFailoverService failoverService, 
      ChatMessageRepository chatMessageRepository,
      OrderServiceRepository orderRepository,
      ContactOrderRepository contactRepository) {
    this.failoverService = failoverService;
    this.chatMessageRepository = chatMessageRepository;
    this.orderRepository = orderRepository;
    this.contactRepository = contactRepository;
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
                      "The user asked: %s\nSystem context: The order %s status is currently %s, payment status is %s, and the tracking number is %s. " +
                      "Please present this status nicely and politely to the user.",
                      userMessageStr,
                      orderNum,
                      order.getOrderStatus(),
                      order.getPaymentStatus(),
                      order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not Shipped Yet"
                  );
              } else {
                  orderContext = "The user asked: " + userMessageStr + "\nSystem context: Order " + orderNum + " was not found in the database. Please inform the user politely.";
              }

              try {
                  aiResponse = failoverService.chat(RESOLVER_PROMPT, orderContext);
              } catch (Exception orderLookupEx) {
                  log.warn("AI API failed during order lookup follow-up: {}", orderLookupEx.getMessage());
                  if (order != null) {
                      aiResponse = String.format("Humbly informing you that order %s is currently %s (Payment: %s). Tracking: %s.",
                          orderNum, order.getOrderStatus(), order.getPaymentStatus(),
                          order.getTrackingNumber() != null ? order.getTrackingNumber() : "Not shipped yet");
                  } else {
                      aiResponse = "We could not find order number " + orderNum + " in our records. Please contact support.";
                  }
              }
          }
      }
      // Check if the AI requested a support ticket lookup
      else if (aiResponse != null && aiResponse.contains("[LOOKUP_TICKET:")) {
          Pattern pattern = Pattern.compile("\\[LOOKUP_TICKET:\\s*([^\\]]+)\\]");
          Matcher matcher = pattern.matcher(aiResponse);
          if (matcher.find()) {
              String ticketId = matcher.group(1).trim();
              // Extract the UUID prefix (e.g. from OD-TKT-8CC9D879, get 8CC9D879)
              String uuidPrefix = ticketId.replace("OD-TKT-", "").trim().toLowerCase();
              Contact ticket = contactRepository.findByUuidPrefix(uuidPrefix).orElse(null);

              String ticketContext;
              if (ticket != null) {
                  ticketContext = String.format(
                      "The user asked: %s\nSystem context: Support ticket %s status is currently %s. The customer's inquiry message was: \"%s\". The admin reply is: \"%s\". " +
                      "Please present this status politely and concisely to the customer.",
                      userMessageStr,
                      ticketId,
                      ticket.getStatus(),
                      ticket.getMessage(),
                      ticket.getReplyMessage() != null ? ticket.getReplyMessage() : "No reply yet. Our team will update you shortly."
                  );
              } else {
                  ticketContext = "The user asked: " + userMessageStr + "\nSystem context: Support ticket " + ticketId + " was not found. Please inform the user politely.";
              }

              try {
                  aiResponse = failoverService.chat(RESOLVER_PROMPT, ticketContext);
              } catch (Exception ticketLookupEx) {
                  log.warn("AI API failed during ticket lookup follow-up: {}", ticketLookupEx.getMessage());
                  if (ticket != null) {
                      aiResponse = String.format("Your support ticket %s is currently %s. Reply: %s.",
                          ticketId, ticket.getStatus(),
                          ticket.getReplyMessage() != null ? ticket.getReplyMessage() : "Under review.");
                  } else {
                      aiResponse = "We could not locate support ticket " + ticketId + ". Please contact support.";
                  }
              }
          }
      }
    } catch (Exception e) {
        log.error("AI Chat service failed. Error: {}", e.getMessage(), e);
        aiResponse = "I'm sorry, our AI assistant is currently experiencing an issue. Please try again in a moment or contact our support team for help.";
    }

    // Save Bot message to history
    ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", aiResponse);
    chatMessageRepository.save(botLog);

    return ResponseEntity.ok(Map.of("response", aiResponse));
  }
}
