package com.durgashakti.chat.scheduler;

import com.durgashakti.chat.repository.ChatMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
public class ChatExpiryScheduler {
    private static final Logger log = LoggerFactory.getLogger(ChatExpiryScheduler.class);

    private final ChatMessageRepository chatMessageRepository;

    public ChatExpiryScheduler(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    // Runs every day at 1:00 AM to delete chat logs older than 15 days
    @Scheduled(cron = "0 0 1 * * ?")
    public void deleteExpiredChats() {
        try {
            OffsetDateTime cutoff = OffsetDateTime.now().minusDays(15);
            log.info("Running scheduled cron to purge chat history logs older than 15 days (Cutoff: {})...", cutoff);
            chatMessageRepository.deleteExpiredChats(cutoff);
            log.info("Successfully completed chat history logs purge.");
        } catch (Exception e) {
            log.error("Failed to execute chat history log purge scheduled task: {}", e.getMessage());
        }
    }
}
