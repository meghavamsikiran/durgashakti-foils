package com.durgashakti.common.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@ConditionalOnExpression("systemEnvironment['DATABASE_URL'] != null && !systemEnvironment['DATABASE_URL'].isEmpty()")
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    // Regex to parse postgres://[user[:password]@]host[:port][/dbname][?query] robustly even with special characters
    private static final Pattern DB_URL_PATTERN = Pattern.compile(
            "^(?:postgres|postgresql)://(?:([^:@]+)(?::([^@]*))?@)?([^:/?#]+)(?::(\\d+))?(/[^?#]*)?(?:\\?([^#]*))?$"
    );

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        log.info("Parsing DATABASE_URL environment variable for database configuration");
        try {
            String host = "localhost";
            int port = 5432;
            String path = "/postgres";
            String username = "postgres";
            String password = "";
            String query = "";

            Matcher matcher = DB_URL_PATTERN.matcher(databaseUrl.trim());
            if (matcher.matches()) {
                String u = matcher.group(1);
                String p = matcher.group(2);
                String h = matcher.group(3);
                String pt = matcher.group(4);
                String ph = matcher.group(5);
                String q = matcher.group(6);

                if (u != null) username = URLDecoder.decode(u, StandardCharsets.UTF_8);
                if (p != null) password = URLDecoder.decode(p, StandardCharsets.UTF_8);
                if (h != null) host = h;
                if (pt != null) port = Integer.parseInt(pt);
                if (ph != null) path = ph;
                if (q != null) query = q;
            } else {
                // Fallback to URI parsing
                String cleanUrl = databaseUrl.replaceFirst("^postgres://", "postgresql://");
                URI dbUri = new URI(cleanUrl);
                if (dbUri.getHost() != null) host = dbUri.getHost();
                if (dbUri.getPort() != -1) port = dbUri.getPort();
                if (dbUri.getPath() != null) path = dbUri.getPath();
                if (dbUri.getUserInfo() != null) {
                    String[] userInfo = dbUri.getUserInfo().split(":", 2);
                    username = URLDecoder.decode(userInfo[0], StandardCharsets.UTF_8);
                    if (userInfo.length > 1) {
                        password = URLDecoder.decode(userInfo[1], StandardCharsets.UTF_8);
                    }
                }
                if (dbUri.getQuery() != null) query = dbUri.getQuery();
            }

            // Construct JDBC URL
            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                    .append(host)
                    .append(":")
                    .append(port)
                    .append(path);

            if (query != null && !query.isEmpty()) {
                jdbcUrl.append("?").append(query);
                if (!query.contains("prepareThreshold")) {
                    jdbcUrl.append("&prepareThreshold=0");
                }
            } else {
                jdbcUrl.append("?sslmode=require&prepareThreshold=0");
            }

            log.info("JDBC URL constructed successfully: jdbc:postgresql://{}:{}{} (sslmode derived/defaulted)", host, port, path);

            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(jdbcUrl.toString());
            config.setUsername(username);
            config.setPassword(password);
            config.setDriverClassName("org.postgresql.Driver");
            config.setMaximumPoolSize(5);
            config.setMinimumIdle(1);
            config.setConnectionTimeout(30000);
            config.setIdleTimeout(600000);
            config.setMaxLifetime(1800000);
            config.setConnectionInitSql("SET timezone = 'UTC'");

            return new HikariDataSource(config);
        } catch (Exception e) {
            log.error("Failed to parse DATABASE_URL environment variable: {}", e.getMessage(), e);
            throw new RuntimeException("Invalid DATABASE_URL config", e);
        }
    }
}
