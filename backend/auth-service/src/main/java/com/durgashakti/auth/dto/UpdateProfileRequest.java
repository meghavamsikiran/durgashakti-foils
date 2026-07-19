package com.durgashakti.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Email(message = "Email should be valid")
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    private String phone;
}
