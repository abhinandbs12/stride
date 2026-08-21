package com.smartroute.web.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCustomerRequest(
    @NotBlank String name,
    @Email String email,
    String phone,
    String address,
    @NotNull Double latitude,
    @NotNull Double longitude
) {}
