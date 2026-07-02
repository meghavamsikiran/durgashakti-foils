package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RazorpaySyncRequest {
    @JsonProperty("order_id")
    private String orderId;

    @JsonProperty("order_number")
    private String orderNumber;

    @JsonProperty("razorpay_order_id")
    private String razorpayOrderId;

    @JsonProperty("razorpay_payment_id")
    private String razorpayPaymentId;
}
