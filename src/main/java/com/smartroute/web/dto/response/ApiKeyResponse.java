package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ApiKeyResponse(
    UUID id,
    String name,
    String keyPrefix,
    String role,
    boolean active,
    Instant createdAt,
    Instant lastUsedAt
) {}
