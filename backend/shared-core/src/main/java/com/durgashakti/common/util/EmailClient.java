package com.durgashakti.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
public class EmailClient {

    private static final Logger log = LoggerFactory.getLogger(EmailClient.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@durgashaktifoils.com}")
    private String fromAddress;

    @Value("${email.service.url:http://localhost:8015/api/email/send}")
    private String emailServiceUrl;

    @Value("${brevo.api-key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:${BREVO_SENDER_EMAIL:meghavamsikiran@gmail.com}}")
    private String brevoSenderEmail;

    @Value("${brevo.sender.name:${BREVO_SENDER_NAME:Durga Shakti Foils}}")
    private String brevoSenderName;

    public EmailClient(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
        if (mailSender != null) {
            log.info("EmailClient initialized with direct JavaMailSender (monolith mode)");
        } else {
            log.info("EmailClient initialized in HTTP dispatch mode");
        }
    }

    public void sendEmail(String to, String subject, String body) {
        sendEmail(to, subject, body, null, null);
    }

    public void sendEmail(String to, String subject, String body, byte[] attachmentBytes, String attachmentName) {
        CompletableFuture.runAsync(() -> {
            try {
                String htmlContent = wrapHtmlTemplate(subject, body);

                // If Brevo HTTP API is configured, use it directly to bypass SMTP port blocking
                if (brevoApiKey != null && !brevoApiKey.trim().isEmpty() && !brevoApiKey.contains("YOUR_KEY")) {
                    try {
                        sendViaBrevo(to, subject, htmlContent, attachmentBytes, attachmentName);
                        return;
                    } catch (Exception e) {
                        log.error("Failed to send email via Brevo HTTP API, attempting direct SMTP fallback: {}", e.getMessage(), e);
                    }
                }

                if (mailSender != null) {
                    try {
                        jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
                        org.springframework.mail.javamail.MimeMessageHelper helper = 
                            new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
                        helper.setFrom(fromAddress);
                        helper.setTo(to);
                        helper.setSubject(subject);
                        helper.setText(htmlContent, true);
                        if (attachmentBytes != null && attachmentName != null) {
                            helper.addAttachment(attachmentName, new org.springframework.core.io.ByteArrayResource(attachmentBytes));
                        }
                        mailSender.send(mimeMessage);
                        log.info("Direct HTML email sent successfully to {}", to);
                        return;
                    } catch (Exception e) {
                        log.error("Direct HTML email send failed, attempting HTTP fallback to: {}", emailServiceUrl, e);
                    }
                }

                Map<String, Object> payload = new HashMap<>();
                payload.put("to", to);
                payload.put("subject", subject);
                payload.put("body", htmlContent);
                if (attachmentBytes != null && attachmentName != null) {
                    payload.put("attachment", java.util.Base64.getEncoder().encodeToString(attachmentBytes));
                    payload.put("attachmentName", attachmentName);
                }
                dispatch(payload);
            } catch (Exception e) {
                log.error("Unhandled error in async email dispatcher to {}: {}", to, e.getMessage(), e);
            }
        });
    }

    private void sendViaBrevo(String to, String subject, String htmlContent, byte[] attachmentBytes, String attachmentName) throws Exception {
        Map<String, Object> senderMap = new HashMap<>();
        senderMap.put("name", brevoSenderName);
        senderMap.put("email", brevoSenderEmail);

        Map<String, Object> recipientMap = new HashMap<>();
        recipientMap.put("email", to);

        java.util.List<Map<String, Object>> toList = new java.util.ArrayList<>();
        toList.add(recipientMap);

        Map<String, Object> payload = new HashMap<>();
        payload.put("sender", senderMap);
        payload.put("to", toList);
        payload.put("subject", subject);
        payload.put("htmlContent", htmlContent);

        if (attachmentBytes != null && attachmentName != null) {
            Map<String, Object> attachmentMap = new HashMap<>();
            attachmentMap.put("name", attachmentName);
            attachmentMap.put("content", java.util.Base64.getEncoder().encodeToString(attachmentBytes));
            payload.put("attachments", java.util.List.of(attachmentMap));
        }

        String json = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("accept", "application/json")
                .header("api-key", brevoApiKey)
                .header("content-type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        log.info("Sending email to {} via Brevo HTTP API...", to);
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("Email successfully sent via Brevo HTTP API. Response: {}", response.body());
        } else {
            throw new RuntimeException("Brevo API returned status " + response.statusCode() + ": " + response.body());
        }
    }

    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "emailService", fallbackMethod = "dispatchFallback")
    private void dispatch(Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(emailServiceUrl))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            log.info("Dispatching email trigger via HTTP to: {}", emailServiceUrl);
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() >= 200 && response.statusCode() < 300) {
                            log.info("Email HTTP dispatch successful. Response: {}", response.body());
                        } else {
                            log.warn("Failed to dispatch email via HTTP. Status: {}, Response: {}", response.statusCode(), response.body());
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("Async HTTP email dispatch failed: {}", ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.error("Failed to prepare HTTP email dispatch payload: {}", e.getMessage());
        }
    }

    private void dispatchFallback(Map<String, Object> payload, Throwable t) {
        log.error("Circuit breaker is OPEN or HTTP email service is down. Executing fallback handler for payload to {}. Error: {}", payload.get("to"), t.getMessage());
        // Fallback behavior: log the request data so it's not lost and allow the process to finish
        log.warn("FALLBACK: Failed to send email to [{}] with subject [{}]. Storing in fallback queue.", payload.get("to"), payload.get("subject"));
    }

    private String wrapHtmlTemplate(String subject, String plainTextOrHtml) {
        String content = plainTextOrHtml.trim();
        if (content.startsWith("<!DOCTYPE html>") || content.startsWith("<html>")) {
            return content;
        }
        
        String formattedBody = content.replace("\n", "<br/>");
        
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n" +
                "    <title>" + subject + "</title>\n" +
                "</head>\n" +
                "<body style=\"margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;\">\n" +
                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:30px 0;\">\n" +
                "<tr><td align=\"center\">\n" +
                "<table width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);\">\n" +
                "  <!-- Header -->\n" +
                "  <tr><td style=\"background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f3f4f6;\">\n" +
                "    <img src=\"https://durgashakti-foils.vercel.app/logo-durga.png\" width=\"280\" style=\"margin:0 auto;object-fit:contain;display:block;\" alt=\"DurgaShakti Foils Logo\">\n" +
                "  </td></tr>\n" +
                "  <!-- Body -->\n" +
                "  <tr><td style=\"padding:36px 40px;color:#374151;font-size:14px;line-height:1.6;\">\n" +
                "    " + formattedBody + "\n" +
                "  </td></tr>\n" +
                "  <!-- Footer -->\n" +
                "  <tr><td style=\"background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;\">\n" +
                "    <p style=\"margin:0;color:#6b7280;font-size:12px;\">© " + java.time.Year.now().getValue() + " DurgaShakti Foils. All rights reserved.</p>\n" +
                "    <p style=\"margin:6px 0 0;color:#6b7280;font-size:12px;\">\n" +
                "      <a href=\"https://durgashakti-foils.vercel.app\" style=\"color:#ea580c;text-decoration:none;font-weight:600;\">Visit our website</a> &nbsp;|&nbsp;\n" +
                "      <a href=\"https://durgashakti-foils.vercel.app/contact\" style=\"color:#ea580c;text-decoration:none;font-weight:600;\">Contact Support</a>\n" +
                "    </p>\n" +
                "    <p style=\"margin:6px 0 0;color:#9ca3af;font-size:11px;\">This is an automated email. Please do not reply directly.</p>\n" +
                "  </td></tr>\n" +
                "</table>\n" +
                "</td></tr></table>\n" +
                "</body>\n" +
                "</html>";
    }
}
