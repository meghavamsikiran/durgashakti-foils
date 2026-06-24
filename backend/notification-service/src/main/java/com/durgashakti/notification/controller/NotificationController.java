package com.durgashakti.notification.controller;

import com.durgashakti.common.entity.Notification;
import com.durgashakti.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/dispatch")
    public ResponseEntity<Map<String, Object>> dispatchNotification(@RequestBody Map<String, Object> payload) {
        String method = String.valueOf(payload.getOrDefault("method", "in_app"));
        if ("email".equalsIgnoreCase(method)) {
            String to = String.valueOf(payload.get("to"));
            String subject = String.valueOf(payload.get("subject"));
            String body = String.valueOf(payload.get("body"));
            notificationService.sendEmail(to, subject, body);
            return ResponseEntity.ok(Map.of("status", "sent", "method", "email"));
        } else {
            UUID userId = UUID.fromString(String.valueOf(payload.get("user_id")));
            String title = String.valueOf(payload.get("title"));
            String message = String.valueOf(payload.get("message"));
            String type = String.valueOf(payload.getOrDefault("type", "info"));
            Notification n = notificationService.sendInAppNotification(userId, title, message, type);
            return ResponseEntity.ok(Map.of("status", "sent", "method", "in_app", "notification_id", n.getId().toString()));
        }
    }
}
