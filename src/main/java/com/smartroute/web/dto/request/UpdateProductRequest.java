package com.smartroute.web.dto.request;

public record UpdateProductRequest(
    String name,
    String category,
    Double unitWeightKg,
    Integer reorderThreshold
) {}
