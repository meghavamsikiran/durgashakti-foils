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

import jakarta.servlet.http.HttpServletRequest;
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

    /**
     * IP-based geolocation: extracts the caller's real IP from the request
     * (respecting X-Forwarded-For from Render/Vercel proxy) and queries
     * ip-api.com for real location data.
     */
    @GetMapping("/ip-lookup")
    public ResponseEntity<Map<String, Object>> ipLookup(HttpServletRequest request) {
        Map<String, Object> result = new HashMap<>();

        // Extract real client IP (Render/Vercel sets X-Forwarded-For)
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp != null && !clientIp.isEmpty()) {
            // X-Forwarded-For can be comma-separated; first IP is the real client
            clientIp = clientIp.split(",")[0].trim();
        }
        if (clientIp == null || clientIp.isEmpty() || "127.0.0.1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp)) {
            clientIp = request.getRemoteAddr();
        }

        // Skip private/loopback IPs (local dev)
        if (clientIp == null || clientIp.startsWith("127.") || clientIp.startsWith("10.") 
            || clientIp.startsWith("192.168.") || clientIp.equals("0:0:0:0:0:0:0:1")) {
            log.info("IP lookup skipped for private/loopback IP: {}", clientIp);
            return ResponseEntity.ok(result);
        }

        log.info("IP lookup for client IP: {}", clientIp);

        // 1. Primary: ip-api.com (free, no key needed, good India coverage)
        try {
            String url = String.format("http://ip-api.com/json/%s?fields=status,city,regionName,zip,lat,lon,query", clientIp);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if ("success".equals(root.path("status").asText(""))) {
                    String city = root.path("city").asText("").trim();
                    String state = root.path("regionName").asText("").trim();
                    String pincode = root.path("zip").asText("").trim();
                    double lat = root.path("lat").asDouble(0);
                    double lon = root.path("lon").asDouble(0);

                    if (!city.isEmpty() || !state.isEmpty()) {
                        result.put("source", "ip-api.com");
                        result.put("city", city);
                        result.put("state", state);
                        result.put("pincode", pincode);
                        result.put("latitude", lat);
                        result.put("longitude", lon);
                        result.put("ip", clientIp);
                        log.info("ip-api.com lookup success: city={}, state={}, pincode={}, ip={}", city, state, pincode, clientIp);
                        return ResponseEntity.ok(result);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("ip-api.com lookup error: {}", e.getMessage());
        }

        // 2. Fallback: ipapi.co (free tier, 1000 req/day)
        try {
            String url = String.format("https://ipapi.co/%s/json/", clientIp);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "DurgaShaktiFoils/1.0")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                String city = root.path("city").asText("").trim();
                String state = root.path("region").asText("").trim();
                String pincode = root.path("postal").asText("").trim();
                double lat = root.path("latitude").asDouble(0);
                double lon = root.path("longitude").asDouble(0);

                if (!city.isEmpty() || !state.isEmpty()) {
                    result.put("source", "ipapi.co");
                    result.put("city", city);
                    result.put("state", state);
                    result.put("pincode", pincode);
                    result.put("latitude", lat);
                    result.put("longitude", lon);
                    result.put("ip", clientIp);
                    log.info("ipapi.co lookup success: city={}, state={}, pincode={}, ip={}", city, state, pincode, clientIp);
                    return ResponseEntity.ok(result);
                }
            }
        } catch (Exception e) {
            log.warn("ipapi.co lookup error: {}", e.getMessage());
        }

        log.warn("All IP lookup providers failed for IP: {}", clientIp);
        return ResponseEntity.ok(result);
    }
}
