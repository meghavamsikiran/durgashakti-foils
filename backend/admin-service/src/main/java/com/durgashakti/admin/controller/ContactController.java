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

    @PostMapping(value = "/contacts/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadContactAttachment(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        if (file.isEmpty()) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "File is empty");
        }
        String contentType = file.getContentType();
        boolean isImage = contentType != null && contentType.startsWith("image/");
        if (!isImage) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Only image uploads are allowed");
        }
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Image size must be less than 2MB");
        }

        String filename = java.util.UUID.randomUUID() + "_" + file.getOriginalFilename();
        try {
            java.io.File uploadsDir = new java.io.File("uploads");
            if (!uploadsDir.exists()) {
                uploadsDir.mkdirs();
            }
            java.io.File dest = new java.io.File(uploadsDir, filename);
            file.transferTo(dest.getAbsoluteFile());
            
            return ResponseEntity.ok(java.util.Map.of("url", "/uploads/" + filename));
        } catch (Exception e) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save file: " + e.getMessage());
        }
    }
}
