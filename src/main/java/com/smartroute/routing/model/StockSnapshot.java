package com.smartroute.routing.model;

import java.util.UUID;

public record StockSnapshot(
    UUID warehouseId,
    UUID productId,
    int available,
    double latitude,
    double longitude,
    double costFactor
) {}
