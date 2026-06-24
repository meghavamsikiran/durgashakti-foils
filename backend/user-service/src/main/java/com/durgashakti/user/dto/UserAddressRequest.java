package com.durgashakti.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UserAddressRequest {
    private String label;

    @JsonProperty("full_name")
    private String fullName;

    private String phone;

    @JsonProperty("alternate_phone")
    private String alternatePhone;

    @JsonProperty("address_line1")
    private String addressLine1;

    @JsonProperty("address_line2")
    private String addressLine2;

    private String city;
    private String state;
    private String pincode;

    @JsonProperty("is_default")
    private boolean isDefault;
}
