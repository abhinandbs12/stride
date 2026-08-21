package com.smartroute.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
    String secret,
    long accessTokenExpiryMinutes,
    long refreshTokenExpiryDays
) {}
