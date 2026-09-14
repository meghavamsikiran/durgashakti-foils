package com.durgashakti.admin.controller;

import com.durgashakti.common.exception.ApiException;
import com.durgashakti.common.util.SupabaseStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/uploads")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminUploadController {

    private final SupabaseStorageService supabaseStorageService;

    public AdminUploadController(SupabaseStorageService supabaseStorageService) {
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please select an image file to upload.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image file formats are allowed.");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image file size must be less than 10MB.");
        }
        try {
            String fileUrl = supabaseStorageService.uploadFile(file, "uploads");
            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload image: " + e.getMessage());
        }
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadMedia(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please select a media file to upload.");
        }
        if (file.getSize() > 50 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Media file size must be less than 50MB.");
        }
        try {
            String fileUrl = supabaseStorageService.uploadFile(file, "media");
            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload media file: " + e.getMessage());
        }
    }
}
