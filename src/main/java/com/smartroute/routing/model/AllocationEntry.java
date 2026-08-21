package com.smartroute.routing.model;

import java.util.UUID;

public record AllocationEntry(
    UUID warehouseId,
    UUID productId,
    int quantity,
    ScoreBreakdown breakdown
) {}
