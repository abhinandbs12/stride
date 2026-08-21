package com.smartroute.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateWarehouseRequest(
    @NotBlank String name,
    @NotBlank String address,
    @NotNull Double latitude,
    @NotNull Double longitude,
    Double costFactor
) {}
