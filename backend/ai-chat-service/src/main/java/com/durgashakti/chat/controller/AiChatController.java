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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/chat")
public class AiChatController {
  private static final Logger log = LoggerFactory.getLogger(AiChatController.class);

  @Value("${jwt.secret:local_dev_only_ds_foils_jwt_secret_change_me}")
  private String jwtSecret;

  private final GeminiFailoverService failoverService;
  private final ChatMessageRepository chatMessageRepository;
  private final OrderServiceRepository orderRepository;
  private final ContactOrderRepository contactRepository;
  private final ChatSessionRepository chatSessionRepository;
  private final OrderUserRepository orderUserRepository;
  private final JdbcTemplate jdbcTemplate;

  private static final Pattern CODE_TRIVIA_PATTERN = Pattern.compile(
      "(?i)\\b(write\\s+a?\\s*code|write\\s+a?\\s*script|write\\s+a?\\s*program|python|javascript|react|html|css|java|c\\+\\+|sql|algorithm|function|code\\s+for|solve|recipe|who\\s+is|what\\s+is\\s+the\\s+capital|tell\\s+me\\s+a\\s+joke|essay|poem)\\b"
  );
  private static final Pattern DOMAIN_KEYWORDS = Pattern.compile(
      "(?i)\\b(foil|foils|micron|microns|wrap|container|durgashakti|durga|shakti|order|delivery|shipping|price|buy|cost|bulk|discount|coupon|track|tracking|status|ticket|refund|payment|contact|support|phone|help|address|store|roll|wallet|balance|funds)\\b"
  );
  private static final String GUARDRAIL_REFUSAL = "I can only assist with DurgaShakti Foils products, orders, and customer support. How may I help you with our foils today?";

  private static final String SYSTEM_PROMPT = """
      You are DurgaShakti AI, the official AI Customer Support Assistant for DurgaShakti Foils.
      Our brand specializes in premium food-grade aluminium foils (Standard 11 microns, Heavy Duty 18 microns, Super Heavy 25 microns, food containers, cling wraps, custom roll sizes 9m/18m/72m).
      We also have a 'DSF Wallet' feature where customers receive refunds for cancelled orders or returned items. Wallet funds can be used seamlessly on future purchases.

      STRICT DOMAIN GUARDRAILS:
      - You MUST ONLY answer questions directly related to DurgaShakti Foils: products, roll sizes, microns, pricing, custom sizing/bulk inquiries, orders & tracking, shipping/delivery, returns/refunds, customer support, and the DSF Wallet (balance/funds).
      - You may politely answer basic greetings (e.g. "Hi", "Hello") and questions about your name or identity.
      - If the user asks ANY OTHER question unrelated to DurgaShakti Foils (such as writing code, programming, math, history, general knowledge, sports, advice, jokes, or general conversational chat), YOU MUST STRICTLY REFUSE TO ANSWER.
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
      5. If the user asks about their DSF Wallet balance, refunds, or wallet transaction history, reply EXACTLY in this format:
         [LOOKUP_WALLET]
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
      OrderUserRepository orderUserRepository,
      JdbcTemplate jdbcTemplate) {
    this.failoverService = failoverService;
    this.chatMessageRepository = chatMessageRepository;
    this.orderRepository = orderRepository;
    this.contactRepository = contactRepository;
    this.chatSessionRepository = chatSessionRepository;
    this.orderUserRepository = orderUserRepository;
    this.jdbcTemplate = jdbcTemplate;
  }

  private String generateGuestToken(String sessionId) {
    if (sessionId == null || sessionId.isBlank()) return "";
    try {
      Mac hmac = Mac.getInstance("HmacSHA256");
      SecretKeySpec keySpec = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
      hmac.init(keySpec);
      byte[] hash = hmac.doFinal(("guest_session:" + sessionId).getBytes(StandardCharsets.UTF_8));
      StringBuilder hexString = new StringBuilder();
      for (byte b : hash) {
        String hex = Integer.toHexString(0xff & b);
        if (hex.length() == 1) hexString.append('0');
        hexString.append(hex);
      }
      return hexString.toString();
    } catch (Exception e) {
      log.error("Failed to generate guest token for session {}", sessionId, e);
      return "";
    }
  }

  private boolean isValidGuestToken(String sessionId, String providedToken) {
    if (sessionId == null || sessionId.isBlank() || providedToken == null || providedToken.isBlank()) {
      return false;
    }
    String expected = generateGuestToken(sessionId);
    return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), providedToken.getBytes(StandardCharsets.UTF_8));
  }

  private boolean isAuthorizedForSession(String sessionId, Authentication authentication, String guestToken) {
    if (authentication != null && authentication.getPrincipal() != null) {
      return true; // Logged in users & admins are authorized
    }
    if (sessionId != null && !chatSessionRepository.existsById(sessionId)) {
      return true; // Brand new sessions are authorized
    }
    return isValidGuestToken(sessionId, guestToken);
  }

  @GetMapping("/history")
  public ResponseEntity<?> getHistory(
      @RequestParam(name = "sessionId", required = false) String sessionId,
      @RequestParam(name = "guestToken", required = false) String guestTokenParam,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      
      String activeSessionId = (sessionId == null || sessionId.isBlank()) ? "anonymous_session" : sessionId;
      String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenParam;

      if (!isAuthorizedForSession(activeSessionId, authentication, guestToken)) {
          return ResponseEntity.status(HttpStatus.FORBIDDEN)
                  .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
      }

      List<ChatMessage> chatLogs = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(activeSessionId);
      ChatSession session = chatSessionRepository.findById(activeSessionId).orElse(null);
      if (chatLogs.isEmpty() && session != null && session.getUserId() != null) {
          chatLogs = chatMessageRepository.findByUserIdOrderByCreatedAtAsc(session.getUserId());
      }
      
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
      if (session != null) {
          status = session.getStatus();
      }

      List<Map<String, String>> messagesList = chatLogs.stream().map(chatLog -> {
          Map<String, String> m = new java.util.HashMap<>();
          m.put("sender", chatLog.getSender() != null ? chatLog.getSender() : "bot");
          m.put("text", chatLog.getText() != null ? chatLog.getText() : "");
          return m;
      }).collect(Collectors.toList());

      String validGuestToken = generateGuestToken(activeSessionId);

      return ResponseEntity.ok(Map.of(
          "status", status,
          "messages", messagesList,
          "guestToken", validGuestToken
      ));
  }

  @PostMapping
  public ResponseEntity<?> chat(
      @RequestBody Map<String, String> request,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      
    String userMessageStr = request.get("message");
    String sessionId = request.get("sessionId");
    String guestTokenReq = request.get("guestToken");
    String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenReq;

    if (sessionId == null || sessionId.isBlank()) {
        sessionId = "anonymous_session";
    }

    UUID authenticatedUserId = null;
    if (authentication != null && authentication.getPrincipal() != null) {
        try {
            authenticatedUserId = UUID.fromString((String) authentication.getPrincipal());
        } catch (Exception ignored) {}
    }

    // Verify guest token if user is unauthenticated and session already exists
    if (authenticatedUserId == null && chatSessionRepository.existsById(sessionId)) {
        if (!isValidGuestToken(sessionId, guestToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
        }
    }

    String validGuestToken = generateGuestToken(sessionId);

    // Ensure session tracking exists
    if (!chatSessionRepository.existsById(sessionId)) {
        ChatSession chatSession = new ChatSession(sessionId, authenticatedUserId);
        chatSessionRepository.save(chatSession);
    }

    // Check if session has been escalated
    ChatSession currentSession = chatSessionRepository.findById(sessionId).orElse(null);
    if (currentSession != null && "escalated".equalsIgnoreCase(currentSession.getStatus())) {
        return ResponseEntity.ok(Map.of("response", "Live agent connecting... For immediate helpline, call +91 98765 43210.", "guestToken", validGuestToken));
    }

    // Save User message to history first
    ChatMessage userLog = new ChatMessage(authenticatedUserId, sessionId, "user", userMessageStr);
    chatMessageRepository.save(userLog);

    // Guardrail Check: Intercept out-of-scope non-DurgaShakti questions (e.g. coding requests, general trivia)
    if (userMessageStr != null && CODE_TRIVIA_PATTERN.matcher(userMessageStr).find() && !DOMAIN_KEYWORDS.matcher(userMessageStr).find()) {
        ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", GUARDRAIL_REFUSAL);
        chatMessageRepository.save(botLog);
        return ResponseEntity.ok(Map.of("response", GUARDRAIL_REFUSAL, "guestToken", validGuestToken));
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

              try {
                  aiResponse = failoverService.chat(RESOLVER_PROMPT, orderContext);
              } catch (Exception ex) {
                  aiResponse = null;
              }

              // Fallback formatting if AI returns tag or fails
              if (aiResponse == null || aiResponse.contains("[LOOKUP_")) {
                  if (order != null) {
                      aiResponse = String.format("Order #%s status is currently %s. Total amount: ₹%.2f (Payment status: %s).",
                              order.getOrderNumber(), (order.getOrderStatus() != null ? order.getOrderStatus().toUpperCase() : "PROCESSING"),
                              order.getTotalAmount(), (order.getPaymentStatus() != null ? order.getPaymentStatus() : "paid"));
                  } else {
                      aiResponse = String.format("Order #%s was not found in our system. Please double-check your order number.", orderNum);
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

              try {
                  aiResponse = failoverService.chat(RESOLVER_PROMPT, ticketContext);
              } catch (Exception ex) {
                  aiResponse = null;
              }

              // Fallback formatting if AI returns tag or fails
              if (aiResponse == null || aiResponse.contains("[LOOKUP_")) {
                  if (ticket != null) {
                      aiResponse = String.format("Support Ticket #%s status is currently %s. %s",
                              ticketId, ticket.getStatus(),
                              (ticket.getReplyMessage() != null ? "Admin reply: " + ticket.getReplyMessage() : "Our support team is reviewing your ticket and will update you shortly."));
                  } else {
                      aiResponse = String.format("Support Ticket #%s was not found.", ticketId);
                  }
              }
          }
      }
      // Check if the AI requested a wallet lookup
      else if (aiResponse != null && aiResponse.contains("[LOOKUP_WALLET]")) {
          String walletContext;
          double balance = 0.0;
          StringBuilder txLog = new StringBuilder();
          if (authenticatedUserId != null) {
              try {
                  List<Map<String, Object>> wRes = jdbcTemplate.queryForList("SELECT balance FROM wallets WHERE user_id = ?", authenticatedUserId);
                  balance = wRes.isEmpty() ? 0.0 : ((Number) wRes.get(0).get("balance")).doubleValue();
                  List<Map<String, Object>> txRes = jdbcTemplate.queryForList("SELECT amount, type, description, created_at FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 3", authenticatedUserId);
                  if (txRes.isEmpty()) {
                      txLog.append("No recent transactions.");
                  } else {
                      for (Map<String, Object> tx : txRes) {
                          txLog.append(tx.get("type")).append(" of Rs ").append(tx.get("amount"))
                               .append(" (").append(tx.get("description")).append("); ");
                      }
                  }
                  walletContext = String.format("The user asked: %s\nSystem context: The user's current DSF Wallet balance is Rs %.2f. Recent transactions: %s", userMessageStr, balance, txLog.toString());
              } catch (Exception ex) {
                  log.error("Failed to lookup wallet for AI Chat", ex);
                  walletContext = "The user asked: " + userMessageStr + "\nSystem context: We are currently experiencing an issue retrieving wallet information. Please inform the user politely to try again later.";
              }
          } else {
              walletContext = "The user asked: " + userMessageStr + "\nSystem context: The user is not logged in. Please inform them that they must log in to their account to view their DSF Wallet balance and history.";
          }

          try {
              aiResponse = failoverService.chat(RESOLVER_PROMPT, walletContext);
          } catch (Exception ex) {
              aiResponse = null;
          }

          // Fallback formatting if AI returns tag or fails
          if (aiResponse == null || aiResponse.contains("[LOOKUP_")) {
              if (authenticatedUserId != null) {
                  aiResponse = String.format("Your current DSF Wallet balance is ₹%.2f. %s", balance,
                          (txLog.length() > 0 ? "Recent transactions: " + txLog.toString() : "Wallet funds are credited automatically for order returns/cancellations."));
              } else {
                  aiResponse = "Please log in to your account to view your DSF Wallet balance and transaction history.";
              }
          }
      }
    } catch (Exception e) {
        log.error("AI Chat service failed. Error: {}", e.getMessage(), e);
        aiResponse = "Hello! Welcome to DurgaShakti Foils. How can I assist you with our food packaging products, orders, or refunds today?";
    }

    // Safety check: Strip any lingering internal [LOOKUP_...] tags
    if (aiResponse != null && aiResponse.contains("[LOOKUP_")) {
        aiResponse = aiResponse.replaceAll("\\[LOOKUP_[^\\]]+\\]", "").trim();
        if (aiResponse.isBlank()) {
            aiResponse = "Hello! How can I assist you with DurgaShakti Foils today?";
        }
    }

    // Save Bot message to history
    ChatMessage botLog = new ChatMessage(authenticatedUserId, sessionId, "bot", aiResponse);
    chatMessageRepository.save(botLog);

    return ResponseEntity.ok(Map.of("response", aiResponse, "guestToken", validGuestToken));
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
  public ResponseEntity<?> closeSession(
      @RequestBody Map<String, String> request,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      String sessionId = request.get("sessionId");
      String guestTokenReq = request.get("guestToken");
      String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenReq;

      if (sessionId == null || sessionId.isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      if (!isAuthorizedForSession(sessionId, authentication, guestToken)) {
          return ResponseEntity.status(HttpStatus.FORBIDDEN)
                  .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
      }

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      if (session != null) {
          session.setStatus("resolved");
          chatSessionRepository.save(session);
      }
      return ResponseEntity.ok(Map.of("status", "resolved"));
  }

  @PostMapping("/session/reopen")
  public ResponseEntity<?> reopenSession(
      @RequestBody Map<String, String> request,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      String sessionId = request.get("sessionId");
      String guestTokenReq = request.get("guestToken");
      String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenReq;

      if (sessionId == null || sessionId.isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      if (!isAuthorizedForSession(sessionId, authentication, guestToken)) {
          return ResponseEntity.status(HttpStatus.FORBIDDEN)
                  .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
      }

      ChatSession session = chatSessionRepository.findById(sessionId).orElse(null);
      if (session != null) {
          session.setStatus("active");
          chatSessionRepository.save(session);
      }
      return ResponseEntity.ok(Map.of("status", "active"));
  }

  @PostMapping("/session/feedback")
  public ResponseEntity<?> submitFeedback(
      @RequestBody Map<String, Object> request,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      String sessionId = String.valueOf(request.get("sessionId"));
      String guestTokenReq = request.get("guestToken") != null ? String.valueOf(request.get("guestToken")) : null;
      String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenReq;
      Boolean satisfied = (Boolean) request.get("satisfied");

      if (sessionId == null || sessionId.isBlank() || "null".equals(sessionId)) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      if (!isAuthorizedForSession(sessionId, authentication, guestToken)) {
          return ResponseEntity.status(HttpStatus.FORBIDDEN)
                  .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
      }

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
  public ResponseEntity<?> escalateSession(
      @RequestBody Map<String, String> request,
      @RequestHeader(name = "X-Guest-Token", required = false) String guestTokenHeader,
      Authentication authentication) {
      String sessionId = request.get("sessionId");
      String guestTokenReq = request.get("guestToken");
      String guestToken = (guestTokenHeader != null && !guestTokenHeader.isBlank()) ? guestTokenHeader : guestTokenReq;

      if (sessionId == null || sessionId.isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("error", "sessionId is required"));
      }

      if (!isAuthorizedForSession(sessionId, authentication, guestToken)) {
          return ResponseEntity.status(HttpStatus.FORBIDDEN)
                  .body(Map.of("error", "Access denied: Invalid or missing guest session token."));
      }

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
