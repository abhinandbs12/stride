package com.smartroute.routing.model;

public record ScoreBreakdown(
    double normalizedDistance,
    double normalizedCost,
    double shortfall
) {
    public double total(double w1, double w2, double w3) {
        return w1 * normalizedDistance + w2 * normalizedCost + w3 * shortfall;
    }
}
