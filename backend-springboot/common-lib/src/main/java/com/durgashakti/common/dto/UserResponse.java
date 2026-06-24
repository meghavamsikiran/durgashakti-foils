package com.durgashakti.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * User response DTO — matches the Python UserSchema exactly.
 * Serialized with snake_case to maintain frontend compatibility.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {

    private String id;
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    private String phone;
    private String role;
    private String status;
    private Map<String, Object> permissions;
    private List<Object> wishlist;

    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
}
