package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    UUID customerId,
    String status,
    List<OrderLineResponse> lines,
    Instant createdAt,
    Instant updatedAt
) {}
