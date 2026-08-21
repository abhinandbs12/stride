package com.smartroute.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
    @NotBlank String refreshToken
) {}
