package com.durgashakti.admin.controller;

import com.durgashakti.admin.repository.AdminSettingRepository;
import com.durgashakti.common.entity.Setting;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

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

            if ("whatsapp_ai_feedback".equals(key)) {
                if (val == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "WhatsApp settings payload is required"));
                }
                String apiToken = val.get("apiToken") != null ? val.get("apiToken").toString().trim() : "";
                String phoneNumberId = val.get("phoneNumberId") != null ? val.get("phoneNumberId").toString().trim() : "";
                if (phoneNumberId.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Meta Cloud API Phone Number ID is mandatory!"));
                }
                if (apiToken.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Meta Access Token is mandatory!"));
                }
            }

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

    /**
     * Test WhatsApp Cloud API with saved credentials — returns raw Meta API response for debugging.
     */
    @PostMapping("/whatsapp/test")
    @PreAuthorize("hasAuthority('manage_settings')")
    public ResponseEntity<?> testWhatsApp(@RequestBody Map<String, Object> req) {
        try {
            String toPhone = req.containsKey("to") ? String.valueOf(req.get("to")) : null;
            String reqTemplate = req.containsKey("templateName") ? String.valueOf(req.get("templateName")).trim() : "3p_direct_integration_test_template";
            if (reqTemplate.isBlank()) reqTemplate = "3p_direct_integration_test_template";
            if (toPhone == null || toPhone.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "'to' phone number is required"));
            }

            // Load credentials from DB
            String apiToken = null;
            String phoneNumberId = null;

            Optional<Setting> settingOpt = settingRepository.findById("whatsapp_ai_feedback");
            Map<String, Object> debugInfo = new HashMap<>();
            if (settingOpt.isPresent()) {
                Map<String, Object> val = settingOpt.get().getValue();
                debugInfo.put("settingFound", true);
                debugInfo.put("settingKeys", val != null ? val.keySet() : List.of());
                if (val != null) {
                    Object tok = val.get("apiToken");
                    Object pid = val.get("phoneNumberId");
                    apiToken = tok != null ? tok.toString().trim() : null;
                    phoneNumberId = pid != null ? pid.toString().trim() : null;
                    debugInfo.put("tokenLength", apiToken != null ? apiToken.length() : 0);
                    debugInfo.put("tokenPrefix", apiToken != null && apiToken.length() > 10 ? apiToken.substring(0, 10) + "..." : "MISSING");
                    debugInfo.put("phoneNumberId", phoneNumberId);
                    debugInfo.put("enabled", val.get("enabled"));
                }
            } else {
                debugInfo.put("settingFound", false);
            }

            if (apiToken == null || apiToken.isBlank()) {
                debugInfo.put("error", "apiToken is missing or blank in DB");
                return ResponseEntity.status(400).body(debugInfo);
            }
            if (phoneNumberId == null || phoneNumberId.isBlank()) {
                debugInfo.put("error", "phoneNumberId is missing or blank in DB");
                return ResponseEntity.status(400).body(debugInfo);
            }

            String cleanPhone = toPhone.replaceAll("[^0-9]", "");
            if (cleanPhone.length() == 10) cleanPhone = "91" + cleanPhone;

            RestTemplate restTemplate = new RestTemplate();
            String url = "https://graph.facebook.com/v20.0/" + phoneNumberId + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken);

            List<String> langCodes = List.of("en_US", "en", "en_GB", "hi", "hi_IN");
            List<Map<String, Object>> failedAttempts = new java.util.ArrayList<>();

            List<List<Map<String, Object>>> componentVariants = new java.util.ArrayList<>();

            if ("hello_world".equalsIgnoreCase(reqTemplate)) {
                componentVariants.add(List.of());
            } else {
                // Variant 1: Body (2 params) + Button Index 0 (1 param: DSF-1001)
                componentVariants.add(List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "Valued Customer"),
                            Map.of("type", "text", "text", "DSF-1001")
                        )
                    ),
                    Map.of(
                        "type", "button",
                        "sub_type", "url",
                        "index", "0",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "DSF-1001")
                        )
                    )
                ));

                // Variant 2: Body (2 params) + Button Index 0 (1 param: Full URL)
                componentVariants.add(List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "Valued Customer"),
                            Map.of("type", "text", "text", "DSF-1001")
                        )
                    ),
                    Map.of(
                        "type", "button",
                        "sub_type", "url",
                        "index", "0",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "https://t.17track.net/en#nums=DSF-1001")
                        )
                    )
                ));

                // Variant 3: Body (2 params) without Button
                componentVariants.add(List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "Valued Customer"),
                            Map.of("type", "text", "text", "DSF-1001")
                        )
                    )
                ));

                // Variant 4: Body (1 param) + Button Index 0 (1 param)
                componentVariants.add(List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "Valued Customer")
                        )
                    ),
                    Map.of(
                        "type", "button",
                        "sub_type", "url",
                        "index", "0",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "DSF-1001")
                        )
                    )
                ));

                // Variant 5: Body (1 param) without Button
                componentVariants.add(List.of(
                    Map.of(
                        "type", "body",
                        "parameters", List.of(
                            Map.of("type", "text", "text", "Valued Customer")
                        )
                    )
                ));

                // Variant 6: No components
                componentVariants.add(List.of());
            }

            for (String lang : langCodes) {
                for (int vIdx = 0; vIdx < componentVariants.size(); vIdx++) {
                    List<Map<String, Object>> components = componentVariants.get(vIdx);

                    Map<String, Object> body = new HashMap<>();
                    body.put("messaging_product", "whatsapp");
                    body.put("to", cleanPhone);
                    body.put("type", "template");

                    Map<String, Object> templateObj = new HashMap<>();
                    templateObj.put("name", reqTemplate);
                    templateObj.put("language", Map.of("code", lang));
                    if (!components.isEmpty()) {
                        templateObj.put("components", components);
                    }

                    body.put("template", templateObj);

                    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                    try {
                        ResponseEntity<String> metaResp = restTemplate.postForEntity(url, entity, String.class);
                        debugInfo.put("metaStatus", metaResp.getStatusCode().value());
                        debugInfo.put("metaResponse", metaResp.getBody());
                        debugInfo.put("success", true);
                        debugInfo.put("acceptedLanguage", lang);
                        debugInfo.put("variantUsed", vIdx + 1);
                        debugInfo.put("phone", cleanPhone);
                        return ResponseEntity.ok(debugInfo);
                    } catch (HttpStatusCodeException httpEx) {
                        String respBody = httpEx.getResponseBodyAsString();
                        Map<String, Object> attempt = new HashMap<>();
                        attempt.put("lang", lang);
                        attempt.put("variantIdx", vIdx + 1);
                        attempt.put("status", httpEx.getStatusCode().value());
                        attempt.put("error", respBody);
                        failedAttempts.add(attempt);

                        // If error is 132001 (Template missing in translation / language 404), break to try next language
                        if (respBody.contains("132001") || httpEx.getStatusCode().value() == 404) {
                            break;
                        }
                    } catch (Exception e) {
                        Map<String, Object> attempt = new HashMap<>();
                        attempt.put("lang", lang);
                        attempt.put("error", e.getMessage());
                        failedAttempts.add(attempt);
                        break;
                    }
                }
            }
            debugInfo.put("success", false);
            debugInfo.put("failedAttempts", failedAttempts);
            return ResponseEntity.status(200).body(debugInfo);
        } catch (Exception e) {
            log.error("WhatsApp test failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
