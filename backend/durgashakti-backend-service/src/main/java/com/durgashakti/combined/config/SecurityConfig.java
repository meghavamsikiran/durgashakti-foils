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
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Auth Service
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/google", "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                // Catalog Service (Public access)
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/settings/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reviews/google-summary").permitAll()
                // Contact
                .requestMatchers(HttpMethod.POST, "/api/contacts", "/api/contact").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/contacts").permitAll()
                // Razorpay Webhooks
                .requestMatchers("/api/payment/razorpay/webhook", "/api/orders/webhook").permitAll()
                // Email Service
                .requestMatchers("/api/email/send").permitAll()
                // Actuator/Health
                .requestMatchers("/actuator/**", "/api/health").permitAll()
                // Admin Area Gates
                .requestMatchers("/api/admin/**", "/api/analytics/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                // Everything else (user, cart, orders, reviews) needs authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
