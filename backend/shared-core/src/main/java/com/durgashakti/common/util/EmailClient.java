package com.durgashakti.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
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

    public EmailClient(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
        if (mailSender != null) {
            log.info("EmailClient initialized with direct JavaMailSender (monolith mode)");
        } else {
            log.info("EmailClient initialized in HTTP dispatch mode");
        }
    }

    public void sendEmail(String to, String subject, String body) {
        if (mailSender != null) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(fromAddress);
                msg.setTo(to);
                msg.setSubject(subject);
                msg.setText(body);
                mailSender.send(msg);
                log.info("Direct email sent successfully to {}", to);
                return;
            } catch (Exception e) {
                log.error("Direct email send failed, attempting HTTP fallback to: {}", emailServiceUrl, e);
            }
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("to", to);
        payload.put("subject", subject);
        payload.put("body", body);
        dispatch(payload);
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
}
