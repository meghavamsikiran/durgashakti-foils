package com.durgashakti.common.security;

import com.durgashakti.common.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Adapts our {@link User} entity to Spring Security's {@link UserDetails} contract.
 * <p>
 * Role mapping (DB value → Spring authority):
 * <ul>
 *   <li>{@code customer}   → {@code ROLE_CUSTOMER}</li>
 *   <li>{@code admin}      → {@code ROLE_ADMIN}</li>
 *   <li>{@code SUPER_ADMIN}→ {@code ROLE_SUPER_ADMIN}</li>
 * </ul>
 */
public class UserPrincipal implements UserDetails {

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    // ── Convenience accessor ────────────────────────────────────────

    public User getUser() {
        return user;
    }

    public UUID getId() {
        return user.getId();
    }

    public String getEmail() {
        return user.getEmail();
    }

    public String getRole() {
        return user.getRole();
    }

    // ── UserDetails implementation ──────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String springRole = mapRole(user.getRole());
        return List.of(new SimpleGrantedAuthority(springRole));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    /**
     * Spring Security identifies users by username — we use the email address.
     */
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"inactive".equalsIgnoreCase(user.getStatus());
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(user.getIsActive());
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /**
     * Map the database role string to a Spring Security {@code ROLE_*} authority.
     */
    private static String mapRole(String role) {
        if (role == null) {
            return "ROLE_CUSTOMER";
        }
        return switch (role) {
            case "SUPER_ADMIN" -> "ROLE_SUPER_ADMIN";
            case "admin" -> "ROLE_ADMIN";
            default -> "ROLE_CUSTOMER";
        };
    }
}
