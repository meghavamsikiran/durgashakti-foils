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
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${notification.service.url:http://localhost:8015/api/notifications/dispatch}")
    private String notificationServiceUrl;

    public void sendEmail(String to, String subject, String body) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("method", "email");
        payload.put("to", to);
        payload.put("subject", subject);
        payload.put("body", body);
        dispatch(payload);
    }

    public void sendInApp(UUID userId, String title, String message, String type) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("method", "in_app");
        payload.put("user_id", userId.toString());
        payload.put("title", title);
        payload.put("message", message);
        payload.put("type", type);
        dispatch(payload);
    }

    private void dispatch(Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(notificationServiceUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            log.info("Dispatching notification trigger to: {}", notificationServiceUrl);
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() >= 200 && response.statusCode() < 300) {
                            log.info("Notification dispatched successfully. Response: {}", response.body());
                        } else {
                            log.warn("Failed to dispatch notification. Status: {}, Response: {}", response.statusCode(), response.body());
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("Async notification dispatch failed: {}", ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.error("Failed to prepare notification dispatch payload: {}", e.getMessage());
        }
    }
}
