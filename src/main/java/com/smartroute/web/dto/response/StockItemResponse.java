package com.smartroute.web.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record StockItemResponse(
    UUID id,
    UUID warehouseId,
    UUID productId,
    int quantity,
    int reservedQuantity,
    int availableToPromise,
    LocalDate batchExpiry,
    long version
) {}
