package com.smartroute.web.dto.response;

import java.util.UUID;

public record ProductResponse(
    UUID id,
    String sku,
    String name,
    String category,
    Double unitWeightKg,
    Integer reorderThreshold
) {}
