package com.smartroute.web.dto.response;

import java.util.List;
import java.util.UUID;

public record OrderLineResponse(
    UUID id,
    UUID productId,
    int quantityRequested,
    List<OrderAllocationResponse> allocations
) {}
