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
import java.util.*;
import java.util.concurrent.*;

@RestController
@RequestMapping("/api/geolocation")
public class GeolocationController {

    private static final Logger log = LoggerFactory.getLogger(GeolocationController.class);
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @GetMapping("/reverse-geocode")
    public ResponseEntity<Map<String, Object>> reverseGeocode(
            @RequestParam("lat") double lat,
            @RequestParam("lon") double lon) {

        log.info("Reverse geocoding request for lat={}, lon={}", lat, lon);
        Map<String, Object> result = new HashMap<>();

        // 1. BigDataCloud
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

        // 2. Nominatim OpenStreetMap
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
     * IP-based geolocation: queries MULTIPLE free IP geo providers in PARALLEL
     * and returns ALL results so the frontend can cross-reference and pick the best.
     */
    @GetMapping("/ip-lookup")
    public ResponseEntity<Map<String, Object>> ipLookup(HttpServletRequest request) {
        Map<String, Object> result = new HashMap<>();

        String clientIp = extractClientIp(request);

        if (clientIp == null || isPrivateIp(clientIp)) {
            log.info("IP lookup skipped for private/loopback IP: {}", clientIp);
            return ResponseEntity.ok(result);
        }

        log.info("IP lookup for client IP: {}", clientIp);
        result.put("ip", clientIp);

        // Query all providers in parallel
        List<Future<Map<String, Object>>> futures = new ArrayList<>();
        futures.add(executor.submit(() -> queryIpApi(clientIp)));
        futures.add(executor.submit(() -> queryIpApiCo(clientIp)));
        futures.add(executor.submit(() -> queryIpInfoIo(clientIp)));
        futures.add(executor.submit(() -> queryIpWhois(clientIp)));

        List<Map<String, Object>> providerResults = new ArrayList<>();
        for (Future<Map<String, Object>> f : futures) {
            try {
                Map<String, Object> r = f.get(6, TimeUnit.SECONDS);
                if (r != null && !r.isEmpty()) {
                    providerResults.add(r);
                }
            } catch (Exception e) {
                // Provider timed out or failed, skip
            }
        }

        result.put("providers", providerResults);
        result.put("count", providerResults.size());

        // Pick the best result by consensus voting on city
        if (!providerResults.isEmpty()) {
            Map<String, Integer> cityVotes = new HashMap<>();
            for (Map<String, Object> pr : providerResults) {
                String city = (String) pr.getOrDefault("city", "");
                if (!city.isEmpty()) {
                    cityVotes.merge(city, 1, Integer::sum);
                }
            }

            // Find city with most votes
            String bestCity = "";
            int maxVotes = 0;
            for (Map.Entry<String, Integer> e : cityVotes.entrySet()) {
                if (e.getValue() > maxVotes) {
                    maxVotes = e.getValue();
                    bestCity = e.getKey();
                }
            }

            // Use the provider result that has the winning city
            if (!bestCity.isEmpty()) {
                for (Map<String, Object> pr : providerResults) {
                    if (bestCity.equals(pr.get("city"))) {
                        result.put("city", pr.get("city"));
                        result.put("state", pr.get("state"));
                        result.put("pincode", pr.getOrDefault("pincode", ""));
                        result.put("latitude", pr.getOrDefault("latitude", 0.0));
                        result.put("longitude", pr.getOrDefault("longitude", 0.0));
                        result.put("source", pr.get("source") + " (consensus: " + maxVotes + "/" + providerResults.size() + ")");
                        break;
                    }
                }
            } else if (!providerResults.isEmpty()) {
                // No city consensus, use first result
                Map<String, Object> first = providerResults.get(0);
                result.put("city", first.getOrDefault("city", ""));
                result.put("state", first.getOrDefault("state", ""));
                result.put("pincode", first.getOrDefault("pincode", ""));
                result.put("latitude", first.getOrDefault("latitude", 0.0));
                result.put("longitude", first.getOrDefault("longitude", 0.0));
                result.put("source", first.get("source"));
            }

            log.info("IP lookup consensus result: city={}, state={}, votes={}/{}", 
                    result.get("city"), result.get("state"), maxVotes, providerResults.size());
        }

        return ResponseEntity.ok(result);
    }

    // ─── Provider query methods ───────────────────────────────────────

    private Map<String, Object> queryIpApi(String ip) {
        try {
            String url = String.format("http://ip-api.com/json/%s?fields=status,city,regionName,zip,lat,lon", ip);
            HttpResponse<String> resp = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if ("success".equals(root.path("status").asText(""))) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("source", "ip-api.com");
                    r.put("city", root.path("city").asText("").trim());
                    r.put("state", root.path("regionName").asText("").trim());
                    r.put("pincode", root.path("zip").asText("").trim());
                    r.put("latitude", root.path("lat").asDouble(0));
                    r.put("longitude", root.path("lon").asDouble(0));
                    return r;
                }
            }
        } catch (Exception e) {
            log.warn("ip-api.com error: {}", e.getMessage());
        }
        return null;
    }

    private Map<String, Object> queryIpApiCo(String ip) {
        try {
            String url = String.format("https://ipapi.co/%s/json/", ip);
            HttpResponse<String> resp = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url))
                            .header("User-Agent", "DurgaShaktiFoils/1.0")
                            .timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if (!root.has("error")) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("source", "ipapi.co");
                    r.put("city", root.path("city").asText("").trim());
                    r.put("state", root.path("region").asText("").trim());
                    r.put("pincode", root.path("postal").asText("").trim());
                    r.put("latitude", root.path("latitude").asDouble(0));
                    r.put("longitude", root.path("longitude").asDouble(0));
                    return r;
                }
            }
        } catch (Exception e) {
            log.warn("ipapi.co error: {}", e.getMessage());
        }
        return null;
    }

    private Map<String, Object> queryIpInfoIo(String ip) {
        try {
            String url = String.format("https://ipinfo.io/%s/json", ip);
            HttpResponse<String> resp = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url))
                            .header("User-Agent", "DurgaShaktiFoils/1.0")
                            .timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                String city = root.path("city").asText("").trim();
                String state = root.path("region").asText("").trim();
                String pincode = root.path("postal").asText("").trim();
                String loc = root.path("loc").asText("").trim(); // "lat,lon"

                double lat = 0, lon = 0;
                if (!loc.isEmpty() && loc.contains(",")) {
                    String[] parts = loc.split(",");
                    lat = Double.parseDouble(parts[0].trim());
                    lon = Double.parseDouble(parts[1].trim());
                }

                if (!city.isEmpty() || !state.isEmpty()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("source", "ipinfo.io");
                    r.put("city", city);
                    r.put("state", state);
                    r.put("pincode", pincode);
                    r.put("latitude", lat);
                    r.put("longitude", lon);
                    return r;
                }
            }
        } catch (Exception e) {
            log.warn("ipinfo.io error: {}", e.getMessage());
        }
        return null;
    }

    private Map<String, Object> queryIpWhois(String ip) {
        try {
            String url = String.format("https://ipwho.is/%s", ip);
            HttpResponse<String> resp = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url))
                            .header("User-Agent", "DurgaShaktiFoils/1.0")
                            .timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if (root.path("success").asBoolean(false)) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("source", "ipwho.is");
                    r.put("city", root.path("city").asText("").trim());
                    r.put("state", root.path("region").asText("").trim());
                    r.put("pincode", root.path("postal").asText("").trim());
                    r.put("latitude", root.path("latitude").asDouble(0));
                    r.put("longitude", root.path("longitude").asDouble(0));
                    return r;
                }
            }
        } catch (Exception e) {
            log.warn("ipwho.is error: {}", e.getMessage());
        }
        return null;
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty()) {
            ip = ip.split(",")[0].trim();
        }
        if (ip == null || ip.isEmpty() || "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    private boolean isPrivateIp(String ip) {
        return ip == null || ip.startsWith("127.") || ip.startsWith("10.")
                || ip.startsWith("192.168.") || ip.startsWith("172.16.")
                || ip.equals("0:0:0:0:0:0:0:1");
    }
}
