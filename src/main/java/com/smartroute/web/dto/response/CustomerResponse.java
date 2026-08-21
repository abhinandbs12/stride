package com.smartroute.web.dto.response;

import java.util.UUID;

public record CustomerResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String address,
    double latitude,
    double longitude
) {}
