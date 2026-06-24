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
    private final com.durgashakti.common.security.JwtUtil jwtUtil;

    public ContactController(ContactService contactService, com.durgashakti.common.security.JwtUtil jwtUtil) {
        this.contactService = contactService;
        this.jwtUtil = jwtUtil;
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

    @GetMapping("/contacts/my")
    public ResponseEntity<Map<String, Object>> getMyTickets(org.springframework.security.core.Authentication authentication) {
        String token = (String) authentication.getCredentials();
        io.jsonwebtoken.Claims claims = jwtUtil.parseToken(token);
        String email = claims.get("email", String.class);
        if (email == null) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Email claim missing in token");
        }
        List<Contact> myTickets = contactService.getMyContactsByEmail(email);
        return ResponseEntity.ok(Map.of("items", myTickets));
    }
}
