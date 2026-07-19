package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class OrderCreateRequest {

    @NotEmpty(message = "Order must contain at least one item")
    private List<Map<String, Object>> items;

    @JsonProperty("total_amount")
    @Min(value = 0, message = "Total amount cannot be negative")
    private double totalAmount;

    @JsonProperty("payment_method")
    @NotBlank(message = "Payment method is required")
    @Pattern(regexp = "^(online|cod)$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "Payment method must be 'online' or 'cod'")
    private String paymentMethod;

    @JsonProperty("shipping_address")
    @NotNull(message = "Shipping address is required")
    private Map<String, Object> shippingAddress;

    @JsonProperty("idempotency_key")
    private String idempotencyKey;

    @JsonProperty("coupon_codes")
    @Size(max = 5, message = "Maximum 5 coupon codes allowed")
    private List<String> couponCodes;
}
