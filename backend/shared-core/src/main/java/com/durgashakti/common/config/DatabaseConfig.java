package com.durgashakti.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

@Configuration
@ConditionalOnExpression("systemEnvironment['DATABASE_URL'] != null && !systemEnvironment['DATABASE_URL'].isEmpty()")
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        log.info("Parsing DATABASE_URL environment variable for database configuration");
        try {
            // Handle postgres:// or postgresql://
            String cleanUrl = databaseUrl.replaceFirst("^postgres://", "postgresql://");
            URI dbUri = new URI(cleanUrl);
            
            String host = dbUri.getHost();
            int port = dbUri.getPort();
            if (port == -1) {
                port = 5432;
            }
            String path = dbUri.getPath();
            
            String username = "";
            String password = "";
            
            if (dbUri.getUserInfo() != null) {
                String[] userInfo = dbUri.getUserInfo().split(":", 2);
                username = userInfo[0];
                if (userInfo.length > 1) {
                    password = userInfo[1];
                }
            }
            
            // Construct JDBC URL
            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                    .append(host)
                    .append(":")
                    .append(port)
                    .append(path);
            
            String query = dbUri.getQuery();
            if (query != null && !query.isEmpty()) {
                jdbcUrl.append("?").append(query);
                if (!query.contains("prepareThreshold")) {
                    jdbcUrl.append("&prepareThreshold=0");
                }
            } else {
                jdbcUrl.append("?sslmode=require&prepareThreshold=0");
            }
            
            log.info("JDBC URL constructed successfully: jdbc:postgresql://{}:{}{} (sslmode derived/defaulted)", host, port, path);
            
            return DataSourceBuilder.create()
                    .url(jdbcUrl.toString())
                    .username(username)
                    .password(password)
                    .driverClassName("org.postgresql.Driver")
                    .build();
        } catch (URISyntaxException | IllegalArgumentException e) {
            log.error("Failed to parse DATABASE_URL environment variable: {}", e.getMessage(), e);
            throw new RuntimeException("Invalid DATABASE_URL config", e);
        }
    }
}
