package com.durgashakti.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class EmailClient {

    private static final Logger log = LoggerFactory.getLogger(EmailClient.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${email.service.url:http://localhost:8015/api/email/send}")
    private String emailServiceUrl;

    public void sendEmail(String to, String subject, String body) {
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

            log.info("Dispatching email trigger to: {}", emailServiceUrl);
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() >= 200 && response.statusCode() < 300) {
                            log.info("Email dispatched successfully. Response: {}", response.body());
                        } else {
                            log.warn("Failed to dispatch email. Status: {}, Response: {}", response.statusCode(), response.body());
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("Async email dispatch failed: {}", ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.error("Failed to prepare email dispatch payload: {}", e.getMessage());
        }
    }
}
