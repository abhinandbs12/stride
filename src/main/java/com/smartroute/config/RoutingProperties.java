package com.smartroute.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "routing")
public record RoutingProperties(
    Weights weights,
    double consolidationBeta,
    int maxCandidatesPerLine,
    double maxCandidateRadiusKm
) {
    public record Weights(
        double distance,
        double cost,
        double shortfall
    ) {}
}
