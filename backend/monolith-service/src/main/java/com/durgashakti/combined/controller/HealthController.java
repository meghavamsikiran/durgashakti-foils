package com.durgashakti.combined.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public HealthController(@org.springframework.beans.factory.annotation.Autowired(required = false) org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final Map<String, String> HEALTH_RESPONSE = Map.of(
            "status", "healthy",
            "message", "DurgaShakti Foils API Server is active"
    );

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        if (jdbcTemplate != null) {
            try {
                // Self-healing: terminate any orphaned DB transactions that are 'idle in transaction'
                jdbcTemplate.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND pid <> pg_backend_pid()");
            } catch (Exception e) {
                // Ignore if permission denied or not Postgres
            }
        }
        return ResponseEntity.ok(HEALTH_RESPONSE);
    }

    @GetMapping("/ping")
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(HEALTH_RESPONSE);
    }
}
