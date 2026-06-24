package com.durgashakti.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
public class MaintenanceFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceFilter.class);

    private static final Set<String> LOCALHOST_ADDRESSES = Set.of(
            "127.0.0.1", "0:0:0:0:0:0:0:1", "::1", "localhost"
    );

    private static final String MAINTENANCE_BODY = """
            {"status":"maintenance","message":"DurgaShakti Foils API is currently undergoing scheduled systems maintenance. We will be back online shortly."}""";

    @Override
    public int getOrder() {
        // Run very early — before rate limiting and routing
        return -10;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String maintenanceMode = System.getenv("BACKEND_MAINTENANCE_MODE");

        if (!"true".equalsIgnoreCase(maintenanceMode)) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest();
        if (isLocalhost(request)) {
            return chain.filter(exchange);
        }

        log.info("Maintenance mode active — rejecting request from {}", resolveClientIp(request));

        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        DataBuffer buffer = response.bufferFactory()
                .wrap(MAINTENANCE_BODY.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    private boolean isLocalhost(ServerHttpRequest request) {
        String clientIp = resolveClientIp(request);
        return LOCALHOST_ADDRESSES.contains(clientIp);
    }

    private String resolveClientIp(ServerHttpRequest request) {
        String xff = request.getHeaders().getFirst("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        InetSocketAddress remoteAddress = request.getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}
