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
        String htmlBody = body.trim().startsWith("<!DOCTYPE html>") || body.trim().startsWith("<html>")
                ? body 
                : wrapHtmlTemplate(subject, body);

        // Try Brevo HTTP API first to bypass SMTP port restrictions
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty() && !brevoApiKey.contains("YOUR_KEY")) {
            try {
                sendViaBrevo(to, subject, htmlBody);
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

    private void sendViaBrevo(String to, String subject, String htmlContent) throws Exception {
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
                "    <title>" + subject + "</title>\n" +
                "    <style>\n" +
                "        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333333; }\n" +
                "        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f6f8; padding: 40px 0; }\n" +
                "        .content-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }\n" +
                "        .header { background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 30px; text-align: center; }\n" +
                "        .header img { height: 50px; }\n" +
                "        .body { padding: 40px 30px; line-height: 1.6; font-size: 14px; color: #4b5563; }\n" +
                "        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; }\n" +
                "        .footer a { color: #10b981; text-decoration: none; font-weight: bold; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"wrapper\">\n" +
                "        <div class=\"content-container\">\n" +
                "            <div class=\"header\">\n" +
                "                <img src=\"https://durgashakti-foils.vercel.app/logo-durga.webp\" alt=\"Durga Shakti Foils Logo\">\n" +
                "            </div>\n" +
                "            <div class=\"body\">\n" +
                "                " + formattedBody + "\n" +
                "            </div>\n" +
                "            <div class=\"footer\">\n" +
                "                <p>&copy; " + java.time.Year.now().getValue() + " Durga Shakti Foils. All rights reserved.</p>\n" +
                "                <p>For support, contact us at <a href=\"mailto:support@durgashaktifoils.com\">support@durgashaktifoils.com</a></p>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }
}
