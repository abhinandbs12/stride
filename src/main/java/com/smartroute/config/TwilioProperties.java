package com.smartroute.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "twilio")
public record TwilioProperties(
    String accountSid,
    String authToken,
    String phoneNumber,
    String adminPhone
) {}
