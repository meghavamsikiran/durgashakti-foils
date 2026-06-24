package com.durgashakti.gateway.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class RateLimitConfig implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(RateLimitConfig.class);

    /** key = "clientIp:routePattern", value = list of request timestamps */
    private final ConcurrentHashMap<String, List<Instant>> requestLog = new ConcurrentHashMap<>();

    private record RateLimitRule(String pathPrefix, HttpMethod method, int maxRequests, int windowSeconds) {}

    private static final List<RateLimitRule> RULES = List.of(
            new RateLimitRule("/api/auth/login", null, 10, 60),
            new RateLimitRule("/api/auth/register", null, 10, 60),
            new RateLimitRule("/api/auth/forgot-password", null, 15, 60),
            new RateLimitRule("/api/orders", HttpMethod.POST, 20, 60)
    );

    @Override
    public int getOrder() {
        // Run early, before routing
        return -2;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();
        HttpMethod method = request.getMethod();

        for (RateLimitRule rule : RULES) {
            if (!path.startsWith(rule.pathPrefix())) {
                continue;
            }
            if (rule.method() != null && !rule.method().equals(method)) {
                continue;
            }

            String clientIp = resolveClientIp(request);
            String key = clientIp + ":" + rule.pathPrefix();

            if (isRateLimited(key, rule.maxRequests(), rule.windowSeconds())) {
                log.warn("Rate limit exceeded for IP {} on path {}", clientIp, rule.pathPrefix());
                return writeRateLimitResponse(exchange);
            }
            // Matched a rule — no need to check further
            break;
        }

        return chain.filter(exchange);
    }

    private boolean isRateLimited(String key, int maxRequests, int windowSeconds) {
        Instant now = Instant.now();
        Instant windowStart = now.minusSeconds(windowSeconds);

        List<Instant> timestamps = requestLog.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>());

        // Evict expired entries
        Iterator<Instant> it = timestamps.iterator();
        while (it.hasNext()) {
            if (it.next().isBefore(windowStart)) {
                it.remove();
            }
        }

        if (timestamps.size() >= maxRequests) {
            return true;
        }

        timestamps.add(now);
        return false;
    }

    private String resolveClientIp(ServerHttpRequest request) {
        // Prefer X-Forwarded-For for proxied requests
        String xff = request.getHeaders().getFirst("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String xRealIp = request.getHeaders().getFirst("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        InetSocketAddress remoteAddress = request.getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }

    private Mono<Void> writeRateLimitResponse(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"detail\":\"Rate limit exceeded. Please try again later.\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
