package com.durgashakti.order.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SignatureException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Value("${razorpay.key-id:fake_key_id}")
    private String keyId;

    @Value("${razorpay.key-secret:fake_key_secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret:fake_webhook_secret}")
    private String webhookSecret;

    public Map<String, Object> createRazorpayOrder(String receipt, double amountInRupees) {
        long amountInPaise = Math.round(amountInRupees * 100.0);

        if (isFakeKey(keyId)) {
            // Mock mode
            String mockId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            log.info("Mocking Razorpay order creation for receipt {}. Mock ID: {}", receipt, mockId);
            return Map.of(
                    "id", mockId,
                    "amount", amountInPaise,
                    "currency", "INR",
                    "receipt", receipt,
                    "status", "created"
            );
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", receipt);

            Order order = client.orders.create(orderRequest);
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.get("id"));
            map.put("amount", order.get("amount"));
            map.put("currency", order.get("currency"));
            map.put("receipt", order.get("receipt"));
            map.put("status", order.get("status"));
            return map;
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            throw new RuntimeException("Payment gateway initialization failed: " + e.getMessage());
        }
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (isFakeKey(keyId)) {
            log.info("Mock signature verification successful for orderId {}", orderId);
            return true;
        }

        try {
            String data = orderId + "|" + paymentId;
            String generatedSignature = calculateHmacSha256(data, keySecret);
            return generatedSignature.equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean verifyWebhookSignature(String requestBody, String receivedSignature) {
        if (isFakeKey(keyId)) {
            return true;
        }
        try {
            String generatedSignature = calculateHmacSha256(requestBody, webhookSecret);
            return generatedSignature.equalsIgnoreCase(receivedSignature);
        } catch (Exception e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean isFakeKey(String key) {
        return key == null || key.toLowerCase().contains("fake") || key.toLowerCase().contains("dummy") || key.trim().isEmpty();
    }

    private String calculateHmacSha256(String data, String secret) throws SignatureException {
        try {
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(rawHmac);
        } catch (Exception e) {
            throw new SignatureException("Failed to generate HMAC SHA256", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
