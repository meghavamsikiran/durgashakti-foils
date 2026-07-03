package com.durgashakti.common.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    private final String supabaseUrl;
    private final String supabaseServiceKey;
    private final String bucketName;
    private final RestTemplate restTemplate;

    public SupabaseStorageService(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-key:}") String supabaseServiceKey,
            @Value("${supabase.storage-bucket:durgashakti-assets}") String bucketName) {
        
        // Fallback to Env vars directly if Spring properties are not set
        this.supabaseUrl = (supabaseUrl == null || supabaseUrl.isEmpty()) ? System.getenv("SUPABASE_URL") : supabaseUrl;
        this.supabaseServiceKey = (supabaseServiceKey == null || supabaseServiceKey.isEmpty()) ? System.getenv("SUPABASE_SERVICE_KEY") : supabaseServiceKey;
        this.bucketName = (bucketName == null || bucketName.isEmpty()) ? System.getenv("SUPABASE_STORAGE_BUCKET") : bucketName;
        this.restTemplate = new RestTemplate();
        
        log.info("Initialized SupabaseStorageService. Supabase URL: {}, Bucket: {}", 
                this.supabaseUrl, this.bucketName);
    }

    public String uploadFile(MultipartFile file, String subDir) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String uniqueFilename = UUID.randomUUID().toString() + extension;
        String path = (subDir != null && !subDir.isEmpty()) ? subDir + "/" + uniqueFilename : uniqueFilename;

        if (supabaseUrl != null && !supabaseUrl.trim().isEmpty() && 
            supabaseServiceKey != null && !supabaseServiceKey.trim().isEmpty()) {
            try {
                byte[] bytes = file.getBytes();
                String cleanUrl = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
                String uploadUrl = cleanUrl + "/storage/v1/object/" + bucketName + "/" + path;

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + supabaseServiceKey);
                headers.set("apikey", supabaseServiceKey);
                headers.setContentType(MediaType.valueOf(file.getContentType() != null ? file.getContentType() : "application/octet-stream"));

                HttpEntity<byte[]> entity = new HttpEntity<>(bytes, headers);
                
                log.info("Uploading file {} to Supabase Storage at: {}", originalFilename, uploadUrl);
                ResponseEntity<Map> response = restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, Map.class);
                
                if (response.getStatusCode().is2xxSuccessful()) {
                    String publicUrl = cleanUrl + "/storage/v1/object/public/" + bucketName + "/" + path;
                    log.info("Successfully uploaded file. Public URL: {}", publicUrl);
                    return publicUrl;
                } else {
                    log.error("Failed to upload file to Supabase. Status: {}", response.getStatusCode());
                }
            } catch (Exception e) {
                log.error("Error uploading file to Supabase, falling back to local storage", e);
            }
        }

        // Fallback to local storage
        log.warn("Supabase credentials missing or upload failed. Storing file locally.");
        try {
            File uploadsDir = new File("uploads");
            if (!uploadsDir.exists()) {
                uploadsDir.mkdirs();
            }
            File dest = new File(uploadsDir, uniqueFilename);
            file.transferTo(dest.getAbsoluteFile());
            return "/uploads/" + uniqueFilename;
        } catch (IOException e) {
            log.error("Failed to save file locally", e);
            throw new RuntimeException("Failed to upload file", e);
        }
    }
}
