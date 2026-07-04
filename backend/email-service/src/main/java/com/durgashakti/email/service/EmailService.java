package com.durgashakti.email.service;

public interface EmailService {
    void sendEmail(String to, String subject, String body);
    void sendEmail(String to, String subject, String body, byte[] attachmentBytes, String attachmentName);
}
