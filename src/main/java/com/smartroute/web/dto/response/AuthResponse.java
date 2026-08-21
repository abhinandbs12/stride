package com.smartroute.web.dto.response;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String role,
    UUID userId
) {}
