package com.durgashakti.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class CouponValidateRequest {
    private List<String> codes;

    @JsonProperty("cart_subtotal")
    private double cartSubtotal;

    public List<String> getCodes() {
        return codes;
    }

    public void setCodes(List<String> codes) {
        this.codes = codes;
    }

    public double getCartSubtotal() {
        return cartSubtotal;
    }

    public void setCartSubtotal(double cartSubtotal) {
        this.cartSubtotal = cartSubtotal;
    }
}
