package com.smartroute.web.dto.request;

public record UpdateWarehouseRequest(
    String name,
    String address,
    Double latitude,
    Double longitude,
    Double costFactor,
    Boolean active
) {}
