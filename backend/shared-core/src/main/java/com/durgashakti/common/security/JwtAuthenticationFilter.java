package com.durgashakti.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * JWT authentication filter — extracts the Bearer token from the Authorization header,
 * validates it, and sets the Spring Security authentication context.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = jwtUtil.parseToken(token);
            String userId = claims.get("user_id", String.class);
            if (userId == null) {
                userId = claims.getSubject();
            }
            String role = claims.get("role", String.class);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + (role != null ? role.toUpperCase() : "CUSTOMER")));

                Map<?, ?> permissionsMap = claims.get("permissions", Map.class);
                if (permissionsMap != null) {
                    for (Map.Entry<?, ?> entry : permissionsMap.entrySet()) {
                        if (Boolean.TRUE.equals(entry.getValue())) {
                            authorities.add(new SimpleGrantedAuthority(String.valueOf(entry.getKey())));
                        }
                    }
                }

                if ("SUPER_ADMIN".equalsIgnoreCase(role)) {
                    List<String> allPerms = List.of(
                        "view_products", "edit_products", "view_inventory", "view_orders", 
                        "view_order_details", "view_customers", "view_inquiries", "view_reviews", 
                        "view_transactions", "view_analytics", "view_gst_reports", "manage_admins", 
                        "view_audit_logs", "manage_settings", "manage_coupons"
                    );
                    for (String perm : allPerms) {
                        SimpleGrantedAuthority auth = new SimpleGrantedAuthority(perm);
                        if (!authorities.contains(auth)) {
                            authorities.add(auth);
                        }
                    }
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, token, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            // Don't set authentication — the request will be treated as unauthenticated
        }

        filterChain.doFilter(request, response);
    }
}
