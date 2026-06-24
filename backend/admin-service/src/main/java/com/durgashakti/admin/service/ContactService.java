package com.durgashakti.admin.service;

import com.durgashakti.common.entity.Contact;
import com.durgashakti.admin.repository.ContactRepository;
import com.durgashakti.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ContactService {

    private final ContactRepository contactRepository;

    public ContactService(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    public Contact submitContact(Contact contact) {
        contact.setStatus("pending");
        contact.setCreatedAt(OffsetDateTime.now());
        return contactRepository.save(contact);
    }

    @Transactional(readOnly = true)
    public List<Contact> listInquiries() {
        return contactRepository.findAll();
    }

    public Contact replyToInquiry(UUID id, String replyBody) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Inquiry not found"));

        if ("resolved".equalsIgnoreCase(contact.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot reply to a resolved/closed inquiry.");
        }

        contact.setReplyMessage(replyBody);
        contact.setRepliedAt(OffsetDateTime.now());
        contact.setStatus("replied");
        return contactRepository.save(contact);
    }
}
