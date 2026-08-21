package com.smartroute.web.dto.response;

import java.util.UUID;

public record OrderAllocationResponse(
    UUID id,
    UUID warehouseId,
    int quantityAllocated,
    String scoreBreakdown,
    String status
) {}
