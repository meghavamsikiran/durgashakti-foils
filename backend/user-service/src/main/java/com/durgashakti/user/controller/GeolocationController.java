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
        
        log.info("Reverse geocoding request for lat={}, lon={}", lat, lon);
        Map<String, Object> result = new HashMap<>();

        // 1. Primary Provider for High-Precision India Geocoding: BigDataCloud
        try {
            String bdcUrl = String.format("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=%f&longitude=%f&localityLanguage=en", lat, lon);
            HttpRequest bdcReq = HttpRequest.newBuilder()
                    .uri(URI.create(bdcUrl))
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> bdcResp = httpClient.send(bdcReq, HttpResponse.BodyHandlers.ofString());

            if (bdcResp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(bdcResp.body());
                String city = root.path("city").asText("").trim();
                if (city.isEmpty()) city = root.path("locality").asText("").trim();
                
                String state = root.path("principalSubdivision").asText("").trim();
                String locality = root.path("locality").asText("").trim();
                String pincode = root.path("postcode").asText("").trim();

                if (!city.isEmpty() || !state.isEmpty() || !locality.isEmpty()) {
                    result.put("source", "BigDataCloud");
                    result.put("pincode", pincode);
                    result.put("state", state);
                    result.put("city", city);
                    result.put("locality", locality);
                    result.put("address_line1", locality);
                    result.put("address_line2", city);
                    log.info("BigDataCloud geocode success: city={}, state={}, locality={}, pincode={}", city, state, locality, pincode);
                    return ResponseEntity.ok(result);
                }
            }
        } catch (Exception e) {
            log.warn("BigDataCloud geocoding error: {}", e.getMessage());
        }

        // 2. Secondary Provider: Nominatim OpenStreetMap
        try {
            String url = String.format("https://nominatim.openstreetmap.org/reverse?lat=%f&lon=%f&format=json&accept-language=en", lat, lon);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "DurgaShaktiFoils/1.0 (meghavamsikiran@gmail.com)")
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode address = root.path("address");

                String pincode = address.path("postcode").asText("").trim();
                String state = address.path("state").asText("").trim();

                String locality = address.path("suburb").asText("");
                if (locality.isEmpty()) locality = address.path("neighbourhood").asText("");
                if (locality.isEmpty()) locality = address.path("residential").asText("");
                if (locality.isEmpty()) locality = address.path("quarter").asText("");
                if (locality.isEmpty()) locality = address.path("commercial").asText("");
                if (locality.isEmpty()) locality = address.path("industrial").asText("");
                locality = locality.trim();

                String city = address.path("city").asText("");
                if (city.isEmpty()) city = address.path("town").asText("");
                if (city.isEmpty()) city = address.path("municipality").asText("");
                if (city.isEmpty()) city = address.path("city_district").asText("");
                if (city.isEmpty()) city = address.path("district").asText("");
                if (city.isEmpty()) city = address.path("state_district").asText("");
                if (city.isEmpty()) city = address.path("county").asText("");
                if (city.isEmpty()) city = address.path("village").asText("");
                city = city.trim();

                String road = address.path("road").asText("").trim();

                if (!pincode.isEmpty() || !city.isEmpty() || !locality.isEmpty()) {
                    result.put("source", "Nominatim");
                    result.put("pincode", pincode);
                    result.put("state", state);
                    result.put("city", city);
                    result.put("locality", locality);
                    result.put("address_line1", locality.isEmpty() ? road : (road.isEmpty() ? locality : road + ", " + locality));
                    result.put("address_line2", locality);
                    log.info("Nominatim geocode success: pincode={}, city={}, state={}, locality={}", pincode, city, state, locality);
                    return ResponseEntity.ok(result);
                }
            }
        } catch (Exception e) {
            log.warn("Nominatim geocoding error: {}", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/ip-lookup")
    public ResponseEntity<Map<String, Object>> ipLookup() {
        // IP Lookup disabled to avoid incorrect remote locations (e.g. Portland, OR)
        return ResponseEntity.ok(new HashMap<>());
    }
}
