package com.durgashakti.notification.service;

import com.durgashakti.common.entity.Notification;
import com.durgashakti.notification.repository.NotificationServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationServiceRepository notificationRepository;
    private final JavaMailSender mailSender;

    public NotificationService(NotificationServiceRepository notificationRepository, JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    public Notification sendInAppNotification(UUID userId, String title, String message, String type) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setIsRead(false);
        notification.setCreatedAt(OffsetDateTime.now());
        return notificationRepository.save(notification);
    }

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            // Mirror Python's mock fallback behavior
            log.info("--- MOCK EMAIL SENDER FALLBACK ---");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Body: {}", body);
        }
    }
}
