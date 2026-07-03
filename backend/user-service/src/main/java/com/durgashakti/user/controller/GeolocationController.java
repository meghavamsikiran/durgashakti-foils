package com.durgashakti.user.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/geolocation")
public class GeolocationController {

    private static final Logger log = LoggerFactory.getLogger(GeolocationController.class);
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/reverse-geocode")
    public ResponseEntity<Map<String, Object>> reverseGeocode(
            @RequestParam("lat") double lat,
            @RequestParam("lon") double lon) {
        
        log.info("Reverse geocoding request received for lat={}, lon={}", lat, lon);
        Map<String, Object> result = new HashMap<>();
        result.put("source", "Nominatim");

        try {
            // Call OpenStreetMap Nominatim reverse geocoding API
            String url = String.format("https://nominatim.openstreetmap.org/reverse?lat=%f&lon=%f&format=json&accept-language=en", lat, lon);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    // Nominatim requires a valid User-Agent to prevent getting blocked
                    .header("User-Agent", "DurgaShaktiFoils/1.0 (meghavamsikiran@gmail.com)")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode address = root.path("address");
                
                String pincode = address.path("postcode").asText("").trim();
                String state = address.path("state").asText("").trim();
                
                // City fallback chain
                String city = address.path("city").asText("");
                if (city.isEmpty()) {
                    city = address.path("town").asText("");
                }
                if (city.isEmpty()) {
                    city = address.path("village").asText("");
                }
                if (city.isEmpty()) {
                    city = address.path("county").asText("");
                }
                city = city.trim();

                // Locality fallback chain
                String locality = address.path("suburb").asText("");
                if (locality.isEmpty()) {
                    locality = address.path("neighbourhood").asText("");
                }
                if (locality.isEmpty()) {
                    locality = address.path("city_district").asText("");
                }
                locality = locality.trim();

                String road = address.path("road").asText("").trim();

                result.put("pincode", pincode);
                result.put("state", state);
                result.put("city", city);
                result.put("locality", locality);
                result.put("address_line1", road.isEmpty() ? locality : road);
                result.put("address_line2", locality);
                
                log.info("Geocoding success: pincode={}, city={}, state={}", pincode, city, state);
            } else {
                log.error("Nominatim API returned non-200 status: {}", response.statusCode());
            }
        } catch (Exception e) {
            log.error("Failed to perform reverse geocoding: {}", e.getMessage(), e);
        }

        // Always return a valid map, even if empty, to prevent frontend from crashing
        return ResponseEntity.ok(result);
    }
}
