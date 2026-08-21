package com.smartroute.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateProductRequest(
    @NotBlank String sku,
    @NotBlank String name,
    String category,
    Double unitWeightKg,
    Integer reorderThreshold
) {}
