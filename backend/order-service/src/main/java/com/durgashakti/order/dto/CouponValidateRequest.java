package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class CouponValidateRequest {
    private List<String> codes;

    @JsonProperty("cart_subtotal")
    private double cartSubtotal;
}
