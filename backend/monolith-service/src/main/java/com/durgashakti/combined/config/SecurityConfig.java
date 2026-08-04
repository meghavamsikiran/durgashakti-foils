package com.durgashakti.combined.config;

import com.durgashakti.common.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("combined")
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                // Return 401 Unauthorized (not 403) for unauthenticated requests.
                // This matches the old Python backend behavior and lets the frontend
                // interceptor auto-clear the expired token and redirect to /login.
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"detail\":\"Not authenticated\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Auth Service
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/google", "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                // Catalog Service (Public access)
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/settings/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reviews/google-summary").permitAll()
                // Contact
                .requestMatchers(HttpMethod.POST, "/api/contacts", "/api/contact", "/api/contacts/upload").permitAll()
                // GET /api/contacts requires admin auth (C-08: prevents PII leakage)
                // Razorpay Webhooks, WhatsApp Webhooks and AI chat
                .requestMatchers("/api/payment/razorpay/webhook", "/api/orders/webhook", "/api/public/**", "/api/orders/ai-chat/**", "/api/chat/**").permitAll()
                // C-07: /api/email/send requires authentication (removed permitAll to prevent spam/phishing)
                // Actuator/Health
                .requestMatchers("/actuator/**", "/api/health").permitAll()
                // Static Uploads
                .requestMatchers("/uploads/**").permitAll()
                // Geolocation API (Public lookup)
                .requestMatchers("/api/geolocation/**").permitAll()
                // Admin Area Gates
                .requestMatchers("/api/superadmin/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/admin/**", "/api/analytics/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                // Everything else (user, cart, orders, reviews) needs authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOrigins(java.util.List.of(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "https://durgashakti-foils.vercel.app",
            "https://durgashakti-foils-git-main-meghavamsikirans-projects.vercel.app"
        ));
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
