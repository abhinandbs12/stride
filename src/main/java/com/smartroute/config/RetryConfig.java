package com.smartroute.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

/**
 * Enables Spring Retry for @Retryable (used for optimistic locking retries).
 */
@Configuration
@EnableRetry
public class RetryConfig {
}
