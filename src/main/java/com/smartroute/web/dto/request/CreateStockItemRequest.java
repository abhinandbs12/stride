package com.smartroute.web.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CreateStockItemRequest(
    @NotNull UUID warehouseId,
    @NotNull UUID productId,
    @NotNull @Min(0) Integer quantity,
    LocalDate batchExpiry
) {}
