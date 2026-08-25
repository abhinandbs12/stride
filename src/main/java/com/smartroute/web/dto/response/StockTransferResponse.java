package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StockTransferResponse(
    UUID id,
    UUID sourceWarehouseId,
    String sourceWarehouseName,
    UUID targetWarehouseId,
    String targetWarehouseName,
    UUID productId,
    String productName,
    String sku,
    int quantity,
    String status,
    String trackingRef,
    Instant createdAt,
    Instant updatedAt
) {}
