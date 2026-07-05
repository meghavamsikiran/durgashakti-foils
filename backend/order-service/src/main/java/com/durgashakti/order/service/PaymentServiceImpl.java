package com.durgashakti.order.service;

import com.razorpay.Order;
import com.razorpay.Refund;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceImpl.class);

    @Value("${razorpay.key-id:fake_key_id}")
    private String keyId;

    @Value("${razorpay.key-secret:fake_key_secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret:fake_webhook_secret}")
    private String webhookSecret;

    @Override
    public Map<String, Object> createRazorpayOrder(String receipt, double amountInRupees) {
        long amountInPaise = Math.round(amountInRupees * 100.0);

        if (isFakeKey(keyId)) {
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

    @Override
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

    @Override
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

    @Override
    public Map<String, Object> fetchPayment(String paymentId) {
        if (isFakeKey(keyId)) {
            return Map.of("status", "captured", "id", paymentId);
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            com.razorpay.Payment payment = client.payments.fetch(paymentId);
            Map<String, Object> map = new HashMap<>();
            map.put("id", payment.get("id"));
            map.put("status", payment.get("status"));
            map.put("order_id", payment.get("order_id"));
            map.put("amount", payment.get("amount"));
            return map;
        } catch (RazorpayException e) {
            log.error("Failed to fetch Razorpay payment {}: {}", paymentId, e.getMessage());
            return null;
        }
    }

    @Override
    public Map<String, Object> fetchSuccessfulOrderPayment(String razorpayOrderId) {
        if (isFakeKey(keyId)) {
            return Map.of("status", "captured", "id", "pay_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14));
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            List<com.razorpay.Payment> payments = client.orders.fetchPayments(razorpayOrderId);
            if (payments != null) {
                for (com.razorpay.Payment p : payments) {
                    String status = p.get("status");
                    if ("captured".equalsIgnoreCase(status) || "authorized".equalsIgnoreCase(status)) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", p.get("id"));
                        map.put("status", p.get("status"));
                        map.put("order_id", p.get("order_id"));
                        map.put("amount", p.get("amount"));
                        return map;
                    }
                }
            }
        } catch (RazorpayException e) {
            log.error("Failed to fetch Razorpay payments for order {}: {}", razorpayOrderId, e.getMessage());
        }
        return null;
    }

    @Override
    public Map<String, Object> fetchRefund(String refundId) {
        if (isFakeKey(keyId)) {
            // Mock dynamic transition: return processed with mock ARN/RRN
            return Map.of("status", "processed", "id", refundId, "acquirer_data", Map.of("arn", "ARN_MOCK_" + System.currentTimeMillis()));
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            Refund refund = client.refunds.fetch(refundId);
            Map<String, Object> map = new HashMap<>();
            map.put("id", refund.get("id"));
            map.put("status", refund.get("status"));
            map.put("acquirer_data", refund.get("acquirer_data"));
            return map;
        } catch (RazorpayException e) {
            log.error("Failed to fetch Razorpay refund {}: {}", refundId, e.getMessage());
            return null;
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
