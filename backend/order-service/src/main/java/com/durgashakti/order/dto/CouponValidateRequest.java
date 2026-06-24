package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class CouponValidateRequest {
    private String code;

    @JsonProperty("cart_items")
    private List<Map<String, Object>> cartItems;

    @JsonProperty("cart_total")
    private double cartTotal;
}
