package com.durgashakti.combined.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private static final Map<String, String> HEALTH_RESPONSE = Map.of(
            "status", "healthy",
            "message", "DurgaShakti Foils API Server is active"
    );

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(HEALTH_RESPONSE);
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(HEALTH_RESPONSE);
    }
}
