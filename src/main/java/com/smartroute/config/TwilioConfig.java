package com.smartroute.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TwilioConfig {

    private static final Logger log = LoggerFactory.getLogger(TwilioConfig.class);

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @PostConstruct
    public void init() {
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            log.warn("Twilio credentials not fully configured. SMS alerts will fail silently.");
            return;
        }
        try {
            Twilio.init(accountSid, authToken);
            log.info("Twilio initialized successfully");
        } catch (Exception e) {
            log.warn("Failed to initialize Twilio. SMS alerts will fail silently.", e);
        }
    }
}
