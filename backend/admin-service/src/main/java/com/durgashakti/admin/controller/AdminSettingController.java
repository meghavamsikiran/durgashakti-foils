package com.durgashakti.admin.controller;

import com.durgashakti.admin.repository.AdminSettingRepository;
import com.durgashakti.common.entity.Setting;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminSettingController {

    private static final Logger log = LoggerFactory.getLogger(AdminSettingController.class);
    private final AdminSettingRepository settingRepository;

    public AdminSettingController(AdminSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('manage_settings')")
    public ResponseEntity<?> getSettings() {
        try {
            List<Setting> all = settingRepository.findAll();
            Map<String, Object> response = new HashMap<>();
            for (Setting s : all) {
                response.put(s.getKey(), s.getValue());
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get admin settings", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to retrieve settings: " + e.getMessage()));
        }
    }

    @PostMapping("/settings")
    @PreAuthorize("hasAuthority('manage_settings')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> saveSetting(@RequestBody Map<String, Object> req) {
        try {
            String key = (String) req.get("key");
            if (key == null || key.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Key required"));
            }

            Map<String, Object> val = (Map<String, Object>) req.get("value");

            // 1. Update the target setting
            Optional<Setting> settingOpt = settingRepository.findById(key);
            Setting targetSetting;
            if (settingOpt.isPresent()) {
                targetSetting = settingOpt.get();
                targetSetting.setValue(val);
            } else {
                targetSetting = new Setting();
                targetSetting.setKey(key);
                targetSetting.setValue(val);
            }
            targetSetting.setUpdatedAt(OffsetDateTime.now());
            settingRepository.save(targetSetting);

            // 2. Sync logic between shipping_settings and payment_settings
            if ("shipping_settings".equals(key) && val != null) {
                Optional<Setting> payOpt = settingRepository.findById("payment_settings");
                Setting paySetting = payOpt.orElseGet(() -> {
                    Setting s = new Setting();
                    s.setKey("payment_settings");
                    s.setValue(new HashMap<>());
                    return s;
                });
                Map<String, Object> payVal = new HashMap<>(paySetting.getValue() != null ? paySetting.getValue() : Map.of());
                
                boolean codEnabled = !Boolean.FALSE.equals(val.get("codEnabled"));
                boolean codActive = "Active".equalsIgnoreCase(String.valueOf(val.get("codStatus")));
                payVal.put("cod_enabled", codEnabled && codActive);
                paySetting.setValue(payVal);
                paySetting.setUpdatedAt(OffsetDateTime.now());
                settingRepository.save(paySetting);
                
            } else if ("payment_settings".equals(key) && val != null && val.containsKey("cod_enabled")) {
                Optional<Setting> shipOpt = settingRepository.findById("shipping_settings");
                Setting shipSetting = shipOpt.orElseGet(() -> {
                    Setting s = new Setting();
                    s.setKey("shipping_settings");
                    s.setValue(new HashMap<>());
                    return s;
                });
                Map<String, Object> shipVal = new HashMap<>(shipSetting.getValue() != null ? shipSetting.getValue() : Map.of());
                
                boolean codEnabled = !Boolean.FALSE.equals(val.get("cod_enabled"));
                shipVal.put("codEnabled", codEnabled);
                shipVal.put("codStatus", codEnabled ? "Active" : "Inactive");
                shipSetting.setValue(shipVal);
                shipSetting.setUpdatedAt(OffsetDateTime.now());
                settingRepository.save(shipSetting);
            }

            return ResponseEntity.ok(Map.of("message", "Setting saved"));
        } catch (Exception e) {
            log.error("Failed to save setting", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to save settings: " + e.getMessage()));
        }
    }
}
