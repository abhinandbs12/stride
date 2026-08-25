package com.smartroute.web.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateStockTransferRequest(
    @NotNull UUID sourceWarehouseId,
    @NotNull UUID targetWarehouseId,
    @NotNull UUID productId,
    @Min(1) int quantity
) {}
