package com.durgashakti.email.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.HashMap;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:noreply@durgashaktifoils.com}")
    private String fromAddress;

    @org.springframework.beans.factory.annotation.Value("${brevo.api-key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

    @org.springframework.beans.factory.annotation.Value("${brevo.sender.email:${BREVO_SENDER_EMAIL:meghavamsikiran@gmail.com}}")
    private String brevoSenderEmail;

    @org.springframework.beans.factory.annotation.Value("${brevo.sender.name:${BREVO_SENDER_NAME:Durga Shakti Foils}}")
    private String brevoSenderName;

    private final java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        sendEmail(to, subject, body, null, null);
    }

    @Override
    public void sendEmail(String to, String subject, String body, byte[] attachmentBytes, String attachmentName) {
        String trimmed = body.trim().toLowerCase();
        String htmlBody = trimmed.startsWith("<!doctype html>") || trimmed.startsWith("<html>")
                ? body 
                : wrapHtmlTemplate(subject, body);

        // Try Brevo HTTP API first to bypass SMTP port restrictions
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty() && !brevoApiKey.contains("YOUR_KEY")) {
            try {
                sendViaBrevo(to, subject, htmlBody, attachmentBytes, attachmentName);
                return;
            } catch (Exception e) {
                log.error("Failed to send email via Brevo HTTP API in EmailServiceImpl, falling back to direct SMTP: {}", e.getMessage(), e);
            }
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            if (attachmentBytes != null && attachmentName != null) {
                helper.addAttachment(attachmentName, new org.springframework.core.io.ByteArrayResource(attachmentBytes));
            }
            mailSender.send(mimeMessage);
            log.info("HTML Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
            log.info("--- MOCK EMAIL SENDER FALLBACK ---");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Body: {}", body);
        }
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

        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("accept", "application/json")
                .header("api-key", brevoApiKey)
                .header("content-type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(json))
                .build();

        log.info("Sending HTTP email to {} via Brevo in EmailServiceImpl...", to);
        java.net.http.HttpResponse<String> response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("Email successfully sent via Brevo HTTP API. Response: {}", response.body());
        } else {
            throw new RuntimeException("Brevo API returned status " + response.statusCode() + ": " + response.body());
        }
    }

    private String wrapHtmlTemplate(String subject, String plainText) {
        String formattedBody = plainText.replace("\n", "<br/>");
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
