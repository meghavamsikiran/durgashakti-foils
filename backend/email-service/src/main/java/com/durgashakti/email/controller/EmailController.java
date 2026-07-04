package com.durgashakti.email.controller;

import com.durgashakti.email.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailService emailService;

    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendEmail(@RequestBody Map<String, Object> payload) {
        String to = String.valueOf(payload.get("to"));
        String subject = String.valueOf(payload.get("subject"));
        String body = String.valueOf(payload.get("body"));
        
        byte[] attachmentBytes = null;
        String attachmentName = null;
        if (payload.get("attachment") != null) {
            attachmentBytes = java.util.Base64.getDecoder().decode(String.valueOf(payload.get("attachment")));
            attachmentName = String.valueOf(payload.get("attachmentName"));
        }
        
        if (attachmentBytes != null && attachmentName != null) {
            emailService.sendEmail(to, subject, body, attachmentBytes, attachmentName);
        } else {
            emailService.sendEmail(to, subject, body);
        }
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
