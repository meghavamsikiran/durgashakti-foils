package com.durgashakti.gateway.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private static final Map<String, String> HEALTH_RESPONSE = Map.of(
            "status", "healthy",
            "message", "DurgaShakti Foils API Server is active"
    );

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, String>> health() {
        return Mono.just(HEALTH_RESPONSE);
    }

    @GetMapping(value = "/ping", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, String>> ping() {
        return Mono.just(HEALTH_RESPONSE);
    }
}
