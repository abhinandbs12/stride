package com.smartroute.web.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ApiKeyCreatedResponse(
    UUID id,
    String name,
    String plainKey,
    String keyPrefix,
    String role,
    Instant createdAt
) {}
