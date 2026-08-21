package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.UUID;

public record WarehouseResponse(
    UUID id,
    String name,
    String address,
    double latitude,
    double longitude,
    double costFactor,
    boolean active,
    Instant createdAt,
    Instant updatedAt
) {}
