package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PublicTrackingResponse(
    UUID orderId,
    String trackingNumber,
    String status,
    String carrier,
    String originWarehouse,
    String originAddress,
    double originLat,
    double originLng,
    String customerName,
    String destinationAddress,
    double destLat,
    double destLng,
    int itemCount,
    Instant createdAt,
    Instant updatedAt,
    List<TrackingMilestone> milestones
) {
    public record TrackingMilestone(
        String title,
        String description,
        boolean completed,
        Instant timestamp
    ) {}
}
