package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class OrderCreateRequest {

    private List<Map<String, Object>> items;

    @JsonProperty("total_amount")
    private double totalAmount;

    @JsonProperty("payment_method")
    private String paymentMethod;

    @JsonProperty("shipping_address")
    private Map<String, Object> shippingAddress;

    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @JsonProperty("coupon_codes")
    private List<String> couponCodes;
}
