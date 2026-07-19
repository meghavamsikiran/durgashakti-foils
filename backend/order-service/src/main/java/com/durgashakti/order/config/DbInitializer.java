package com.durgashakti.order.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;

import jakarta.annotation.PostConstruct;

@Slf4j
@Configuration
@Lazy(false) // Force eager loading so this runs immediately on startup, bypassing lazy-init rules
public class DbInitializer {

    private final JdbcTemplate jdbcTemplate;

    public DbInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initDatabase() {
        try {
            log.info("Eager DB Initializer: Checking and creating 'chat_messages' table if not exists...");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS chat_messages (" +
                    "id UUID PRIMARY KEY, " +
                    "user_id UUID, " +
                    "session_id VARCHAR(255) NOT NULL, " +
                    "sender VARCHAR(255) NOT NULL, " +
                    "text TEXT NOT NULL, " +
                    "created_at TIMESTAMP WITH TIME ZONE NOT NULL)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id)");
            log.info("Eager DB Initializer: 'chat_messages' table is ready.");

            log.info("Eager DB Initializer: Checking and creating 'chat_sessions' table if not exists...");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS chat_sessions (" +
                    "session_id VARCHAR(255) PRIMARY KEY, " +
                    "user_id UUID, " +
                    "status VARCHAR(50) NOT NULL, " +
                    "satisfied BOOLEAN, " +
                    "created_at TIMESTAMP WITH TIME ZONE NOT NULL, " +
                    "updated_at TIMESTAMP WITH TIME ZONE)");
            log.info("Eager DB Initializer: 'chat_sessions' table is ready.");
        } catch (Exception e) {
            log.error("Eager DB Initializer: Failed to create database tables on startup: {}", e.getMessage(), e);
        }
    }
}
