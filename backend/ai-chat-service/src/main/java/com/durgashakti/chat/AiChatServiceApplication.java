package com.durgashakti.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.durgashakti.chat", "com.durgashakti.common"})
@EntityScan("com.durgashakti.common.entity")
@EnableJpaRepositories("com.durgashakti.chat.repository")
@EnableScheduling
public class AiChatServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiChatServiceApplication.class, args);
    }
}
