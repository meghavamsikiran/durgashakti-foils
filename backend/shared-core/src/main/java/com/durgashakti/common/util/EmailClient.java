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
import java.util.HashMap;
import java.util.Map;

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
        String htmlContent = wrapHtmlTemplate(subject, body);

        // If Brevo HTTP API is configured, use it directly to bypass SMTP port blocking
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty() && !brevoApiKey.contains("YOUR_KEY")) {
            try {
                sendViaBrevo(to, subject, htmlContent);
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
        dispatch(payload);
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

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("accept", "application/json")
                .header("api-key", brevoApiKey)
                .header("content-type", "application/json")
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

    private void dispatch(Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(emailServiceUrl))
                    .header("Content-Type", "application/json")
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
