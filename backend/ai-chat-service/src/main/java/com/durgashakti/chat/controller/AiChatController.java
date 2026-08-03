package com.durgashakti.chat.controller;

import com.durgashakti.common.entity.ChatMessage;
import com.durgashakti.common.entity.ChatSession;
import com.durgashakti.common.entity.Contact;
import com.durgashakti.common.entity.Order;
import com.durgashakti.common.entity.User;
import com.durgashakti.common.service.GeminiFailoverService;
import com.durgashakti.chat.repository.ChatMessageRepository;
import com.durgashakti.chat.repository.ChatSessionRepository;
import com.durgashakti.order.repository.ContactOrderRepository;
import com.durgashakti.order.repository.OrderServiceRepository;
import com.durgashakti.order.repository.OrderUserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/chat")
public class AiChatController {

  private final GeminiFailoverService failoverService;
  private final ChatMessageRepository chatMessageRepository;
  private final OrderServiceRepository orderRepository;
  private final ContactOrderRepository contactRepository;
  private final ChatSessionRepository chatSessionRepository;
  private final OrderUserRepository orderUserRepository;

  private static final Pattern CODE_TRIVIA_PATTERN = Pattern.compile(
      "(?i)\\b(write\\s+a?\\s*code|write\\s+a?\\s*script|write\\s+a?\\s*program|python|javascript|react|html|css|java|c\\+\\+|sql|algorithm|function|code\\s+for|solve|recipe|who\\s+is|what\\s+is\\s+the\\s+capital|tell\\s+me\\s+a\\s+joke|essay|poem)\\b"
  );
  private static final Pattern DOMAIN_KEYWORDS = Pattern.compile(
      "(?i)\\b(foil|foils|micron|microns|wrap|container|durgashakti|durga|shakti|order|delivery|shipping|price|buy|cost|bulk|discount|coupon|track|tracking|status|ticket|refund|payment|contact|support|phone|help|address|store|roll)\\b"
  );
  private static final String GUARDRAIL_REFUSAL = "I can only assist with DurgaShakti Foils products, orders, and customer support. How may I help you with our foils today?";

  private static final String SYSTEM_PROMPT = """
      You are DurgaShakti AI, the official AI Customer Support Assistant for DurgaShakti Foils.
      Our brand specializes in premium food-grade aluminium foils (Standard 11 microns, Heavy Duty 18 microns, Super Heavy 25 microns, food containers, cling wraps, custom roll sizes 9m/18m/72m).

      STRICT DOMAIN GUARDRAILS:
      - You MUST ONLY answer questions directly related to DurgaShakti Foils: products, roll sizes, microns, pricing, custom sizing/bulk inquiries, orders & tracking, shipping/delivery, returns/refunds, and customer support.
      - If the user asks ANY question unrelated to DurgaShakti Foils (such as writing code, programming, math, history, general knowledge, sports, advice, jokes, or general chat), YOU MUST STRICTLY REFUSE TO ANSWER.
      - Return EXACTLY this refusal message for out-of-scope questions:
        "I can only assist with DurgaShakti Foils products, orders, and customer support. How may I help you with our foils today?"

      CRITICAL BRAND RULES:
      1. Greet the user by name if provided in the prompt context.
      2. Always keep responses short and concise. Do NOT write more than 2-3 sentences.
      3. If the user asks about order status, tracking, or details of a specific order number (e.g. OD-YYYYMMDD-XXXXX), reply EXACTLY in this format:
         [LOOKUP_ORDER: <order-number>]
         Do not write any other text.
      4. If the user asks about a support ticket status or details (e.g. OD-TKT-XXXXXX), reply EXACTLY in this format:
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
      ContactOrderRepository contactRepository,
      ChatSessionRepository chatSessionRepository,
      OrderUserRepository orderUserRepository) {
    this.failoverService = failoverService;
    this.chatMessageRepository = chatMessageRepository;
    this.orderRepository = orderRepository;
    this.contactRepository = contactRepository;
    this.chatSessionRepository = chatSessionRepository;
    this.orderUserRepository = orderUserRepository;
  }

  @GetMapping("/history")
  public ResponseEntity<Map<String, Object>> getHistory(
      @RequestParam(name = "sessionId", required = false) String sessionId,
      Authentication authentication) {
      
      String activeSessionId = (sessionId == null || sessionId.isBlank()) ? "anonymous_session" : sessionId;
      List<ChatMessage> chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(activeSessionId);
      
      if (authentication != null && authentication.getPrincipal() != null) {
          try {
              UUID userId = UUID.fromString((String) authentication.getPrincipal());
              for (ChatMessage chatLog : chatLogs) {
                  if (chatLog.getUserId() == null) {
                      chatLog.setUserId(userId);
                      chatMessageRepository.save(chatLog);
                  }
              }
          } catch (Exception ignored) {}
      }

      String status = "active";
      ChatSession session = chatSessionRepository.findById(activeSessionId).orElse(null);
      if (session != null) {
          status = session.getStatus();
      }

      List<Map<String, String>> messagesList = chatLogs.stream().map(chatLog -> Map.of(
          "sender", chatLog.getSender(),
          "text", chatLog.getText()
      )).collect(Collectors.toList());

      return ResponseEntity.ok(Map.of(
          "status", status,
          "messages", messagesList
      ));
  }

  @PostMapping
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

    // Ensure session tracking exists
    if (!chatSessionRepository.existsById(sessionId)) {
        ChatSession chatSession = new ChatSession(sessionId, authenticatedUserId);
        chatSessionRepository.save(chatSession);
    }

    // Check if session has been escalated
    ChatSession currentSession = chatSessionRepository.findById(sessionId).orElse(null);
    if (currentSession != null && "escalated".equalsIgnoreCase(currentSession.getStatus())) {
        return ResponseEntity.ok(Map.of("response", "Live agent connecting... For immediate helpline, call +91 98765 43210."));
    }

    // Save User message to history first
    ChatMessage userLog = new ChatMessage(authenticatedUserId, sessionId, "user", userMessageStr);
    chatMessageRepository.save(userLog);

    // Guardrail Check: Intercept out-of-scope non-DurgaShakti questions (e.g. coding requests, general trivia)
    if (userMessageStr != null && CODE_TRIVIA_PATTERN.matcher(userMessageStr).find() && !DOMAIN_KEYWORDS.matcher(userMessageStr).find()) {
        ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", GUARDRAIL_REFUSAL);
        chatMessageRepository.save(botLog);
        return ResponseEntity.ok(Map.of("response", GUARDRAIL_REFUSAL));
    }

    // Resolve user's name
    String userName = "Customer";
    if (authenticatedUserId != null) {
        User orderUser = orderUserRepository.findById(authenticatedUserId).orElse(null);
        if (orderUser != null && orderUser.getFullName() != null) {
            userName = orderUser.getFullName();
        }
    }

    // Fetch conversation history (last 15 messages)
    List<ChatMessage> history;
    if (authenticatedUserId != null) {
        history = chatMessageRepository.findByUserIdOrderByCreatedAtAsc(authenticatedUserId);
    } else {
        history = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    StringBuilder historyBuilder = new StringBuilder();
    historyBuilder.append("User Name: ").append(userName).append("\n");
    historyBuilder.append("Conversation History:\n");
    int historyLimit = Math.max(0, history.size() - 15);
    for (int i = historyLimit; i < history.size() - 1; i++) {
        ChatMessage msg = history.get(i);
        historyBuilder.append(msg.getSender().equalsIgnoreCase("user") ? "User: " : "Bot: ")
                      .append(msg.getText())
                      .append("\n");
    }
    historyBuilder.append("User's latest follow-up question: ").append(userMessageStr);
    String inputWithContext = historyBuilder.toString();

    String aiResponse;

    try {
      // Call Gemini directly via native REST API
      aiResponse = failoverService.chat(SYSTEM_PROMPT, inputWithContext);

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
                      "The user asked: %s\nSystem context: Order %s was placed on %s. The current status is %s. The total price is Rs %s. The payment status is %s.",
                      userMessageStr, order.getOrderNumber(), order.getCreatedAt(), order.getOrderStatus(), order.getTotalAmount(), order.getPaymentStatus()
                  );
              } else {
                  orderContext = "The user asked: " + userMessageStr + "\nSystem context: Order " + orderNum + " was not found in our database. Please inform the user politely.";
              }

              aiResponse = failoverService.chat(RESOLVER_PROMPT, orderContext);
          }
      }
      // Check if the AI requested a support ticket lookup
      else if (aiResponse != null && aiResponse.contains("[LOOKUP_TICKET:")) {
          Pattern pattern = Pattern.compile("\\[LOOKUP_TICKET:\\s*([^\\]]+)\\]");
          Matcher matcher = pattern.matcher(aiResponse);
          if (matcher.find()) {
              String ticketId = matcher.group(1).trim();
              String uuidPrefix = ticketId.replace("OD-TKT-", "").trim().toLowerCase();
              Contact ticket = contactRepository.findByUuidPrefix(uuidPrefix).orElse(null);

              String ticketContext;
              if (ticket != null) {
                  ticketContext = String.format(
                      "The user asked: %s\nSystem context: Support ticket %s status is currently %s. The customer's inquiry message was: \"%s\". The admin reply is: \"%s\". ",
                      userMessageStr,
                      ticketId,
                      ticket.getStatus(),
                      ticket.getMessage(),
                      ticket.getReplyMessage() != null ? ticket.getReplyMessage() : "No reply yet. Our team will update you shortly."
                  );
              } else {
                  ticketContext = "The user asked: " + userMessageStr + "\nSystem context: Support ticket " + ticketId + " was not found. Please inform the user politely.";
              }

              aiResponse = failoverService.chat(RESOLVER_PROMPT, ticketContext);
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

  @GetMapping("/user/sessions")
  public ResponseEntity<List<Map<String, Object>>> getUserSessions(Authentication authentication) {
      if (authentication == null || authentication.getPrincipal() == null) {
          return ResponseEntity.ok(List.of());
      }
      try {
          UUID userId = UUID.fromString((String) authentication.getPrincipal());
          List<ChatSession> sessions = chatSessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
          
          List<Map<String, Object>> result = sessions.stream().map(s -> {
              List<ChatMessage> msgs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(s.getSessionId());
              String lastText = msgs.isEmpty() ? "New Conversation" : msgs.get(msgs.size() - 1).getText();
              return Map.<String, Object>of(
                  "sessionId", s.getSessionId(),
                  "status", s.getStatus(),
                  "createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : "",
                  "updatedAt", s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : "",
                  "lastMessage", lastText,
                  "messageCount", msgs.size()
              );
          }).collect(Collectors.toList());

          return ResponseEntity.ok(result);
      } catch (Exception e) {
          return ResponseEntity.ok(List.of());
      }
  }

  @PostMapping("/session/close")
  public ResponseEntity<Map<String, String>> closeSession(@RequestBody Map<String, String> request) {
      String sessionId = request.get("sessionId");
      if (sessionId == null || sessionId.isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      if (session != null) {
          session.setStatus("resolved");
          chatSessionRepository.save(session);
      }
      return ResponseEntity.ok(Map.of("status", "resolved"));
  }

  @PostMapping("/session/reopen")
  public ResponseEntity<Map<String, String>> reopenSession(@RequestBody Map<String, String> request) {
      String sessionId = request.get("sessionId");
      if (sessionId == null || sessionId.isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      if (session != null) {
          session.setStatus("active");
          chatSessionRepository.save(session);
      }
      return ResponseEntity.ok(Map.of("status", "active"));
  }

  @PostMapping("/session/feedback")
  public ResponseEntity<Map<String, String>> submitFeedback(@RequestBody Map<String, Object> request) {
      String sessionId = String.valueOf(request.get("sessionId"));
      Boolean satisfied = (Boolean) request.get("satisfied");

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      String systemMsg;
      if (session != null) {
          session.setSatisfied(satisfied);
          if (Boolean.FALSE.equals(satisfied)) {
              session.setStatus("resolved");
              systemMsg = "We are deeply sorry to hear that we couldn't resolve your issue to your satisfaction.";
          } else {
              session.setStatus("resolved");
              systemMsg = "Thank you so much for your feedback! We are always here to help you. Have a great day ahead!";
          }
          chatSessionRepository.save(session);

          // Save bot message to database log
          ChatMessage systemLog = new ChatMessage(session.getUserId(), sessionId, "bot", systemMsg);
          chatMessageRepository.save(systemLog);
      } else {
          systemMsg = "Feedback recorded. Thank you!";
      }

      return ResponseEntity.ok(Map.of("response", systemMsg));
  }

  @PostMapping("/session/escalate")
  public ResponseEntity<Map<String, String>> escalateSession(@RequestBody Map<String, String> request) {
      String sessionId = request.get("sessionId");
      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      String systemMsg = "I understand your frustration. Connecting you to a live support agent... Please wait while we fetch help. You can also call us directly at +91 98765 43210 for immediate live support.";
      
      if (session != null) {
          session.setStatus("escalated");
          chatSessionRepository.save(session);

          ChatMessage systemLog = new ChatMessage(session.getUserId(), sessionId, "bot", systemMsg);
          chatMessageRepository.save(systemLog);
      }
      
      return ResponseEntity.ok(Map.of("response", systemMsg));
  }

  // ── Admin Live Chat Endpoints ─────────────────────────────────────

  @GetMapping("/sessions")
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public ResponseEntity<List<ChatSession>> getChatSessions() {
      return ResponseEntity.ok(chatSessionRepository.findAll());
  }

  @PostMapping("/admin-message")
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public ResponseEntity<Map<String, String>> sendAdminMessage(@RequestBody Map<String, String> request) {
      String sessionId = request.get("sessionId");
      String adminText = request.get("message");

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      if (session == null) {
          return ResponseEntity.notFound().build();
      }

      // Add message from admin
      ChatMessage adminLog = new ChatMessage(session.getUserId(), sessionId, "bot", "[LIVE AGENT]: " + adminText);
      chatMessageRepository.save(adminLog);

      // Change session status back to active so that the customer input is re-enabled
      session.setStatus("active");
      chatSessionRepository.save(session);

      return ResponseEntity.ok(Map.of("status", "sent"));
  }
}
