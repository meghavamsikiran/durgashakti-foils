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
        
        emailService.sendEmail(to, subject, body);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
