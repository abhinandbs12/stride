package com.smartroute.security;

import com.smartroute.domain.enums.Role;
import java.util.UUID;

public record JwtPrincipal(
    UUID userId,
    String email,
    Role role
) {}
