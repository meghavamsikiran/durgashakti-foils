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
    private final com.durgashakti.common.util.SupabaseStorageService supabaseStorageService;

    public ContactController(
            ContactService contactService, 
            com.durgashakti.common.security.JwtUtil jwtUtil,
            com.durgashakti.common.util.SupabaseStorageService supabaseStorageService) {
        this.contactService = contactService;
        this.jwtUtil = jwtUtil;
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping("/contacts")
    public ResponseEntity<Contact> submitContact(@RequestBody Contact contact) {
        return ResponseEntity.ok(contactService.submitContact(contact));
    }

    @GetMapping("/admin/contacts")
    @PreAuthorize("hasAuthority('view_inquiries')")
    public ResponseEntity<Map<String, Object>> listInquiries(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "start_date", required = false) String startDate,
            @RequestParam(value = "end_date", required = false) String endDate) {
        
        List<Contact> all = contactService.listInquiries();
        
        java.util.stream.Stream<Contact> stream = all.stream();
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            stream = stream.filter(c -> status.equalsIgnoreCase(c.getStatus()));
        }
        if (startDate != null && !startDate.isBlank()) {
            try {
                java.time.LocalDate ld = java.time.LocalDate.parse(startDate);
                java.time.OffsetDateTime start = ld.atStartOfDay(java.time.ZoneOffset.UTC).toOffsetDateTime();
                stream = stream.filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(start));
            } catch (Exception ignored) {}
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                java.time.LocalDate ld = java.time.LocalDate.parse(endDate);
                java.time.OffsetDateTime end = ld.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toOffsetDateTime();
                stream = stream.filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isAfter(end));
            } catch (Exception ignored) {}
        }
        
        List<Contact> filtered = stream
                .sorted((c1, c2) -> {
                    if (c1.getCreatedAt() == null) return 1;
                    if (c2.getCreatedAt() == null) return -1;
                    return c2.getCreatedAt().compareTo(c1.getCreatedAt());
                })
                .collect(java.util.stream.Collectors.toList());
        
        int total = filtered.size();
        int fromIndex = (page - 1) * limit;
        List<Contact> paged = List.of();
        if (fromIndex < total) {
            int toIndex = Math.min(fromIndex + limit, total);
            paged = filtered.subList(fromIndex, toIndex);
        }
        
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("items", paged);
        response.put("total", total);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/contacts/{id}/reply")
    @PreAuthorize("hasAuthority('view_inquiries')")
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

        try {
            String fileUrl = supabaseStorageService.uploadFile(file, "contacts");
            return ResponseEntity.ok(java.util.Map.of("url", fileUrl));
        } catch (Exception e) {
            throw new com.durgashakti.common.exception.ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file: " + e.getMessage());
        }
    }
}
