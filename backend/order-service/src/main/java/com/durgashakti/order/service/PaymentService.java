package com.durgashakti.order.service;

import java.util.Map;

public interface PaymentService {
    Map<String, Object> createRazorpayOrder(String receipt, double amountInRupees);
    boolean verifySignature(String orderId, String paymentId, String signature);
    boolean verifyWebhookSignature(String requestBody, String receivedSignature);
    Map<String, Object> fetchPayment(String paymentId);
    Map<String, Object> fetchSuccessfulOrderPayment(String razorpayOrderId);
    Map<String, Object> fetchRefund(String refundId);
}
