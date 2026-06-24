package com.durgashakti.admin.controller;

import com.durgashakti.common.entity.Contact;
import com.durgashakti.admin.service.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping("/contacts")
    public ResponseEntity<Contact> submitContact(@RequestBody Contact contact) {
        return ResponseEntity.ok(contactService.submitContact(contact));
    }

    @GetMapping("/admin/contacts")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<Contact>> listInquiries() {
        return ResponseEntity.ok(contactService.listInquiries());
    }

    @PostMapping("/admin/contacts/{id}/reply")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Contact> replyToInquiry(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> payload) {
        String reply = payload.get("reply");
        return ResponseEntity.ok(contactService.replyToInquiry(id, reply));
    }
}
