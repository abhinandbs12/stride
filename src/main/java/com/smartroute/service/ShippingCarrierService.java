package com.smartroute.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class ShippingCarrierService {

    private final Random random = new Random();

    public record CarrierRate(String carrierName, double cost) {}

    /**
     * Mocks fetching live rates from shipping carriers based on distance.
     * USPS is generally cheaper for short distances.
     * FedEx is better for long distance.
     */
    public CarrierRate getBestCarrier(double distanceKm, double totalWeightKg) {
        double uspsBase = 5.0;
        double fedexBase = 12.0;
        double upsBase = 9.0;

        // Add distance and weight multipliers
        double uspsCost = uspsBase + (distanceKm * 0.05) + (totalWeightKg * 1.2);
        double fedexCost = fedexBase + (distanceKm * 0.02) + (totalWeightKg * 0.8);
        double upsCost = upsBase + (distanceKm * 0.035) + (totalWeightKg * 1.0);

        // Add some random real-world fluctuation (+/- 10%)
        uspsCost *= (0.9 + random.nextDouble() * 0.2);
        fedexCost *= (0.9 + random.nextDouble() * 0.2);
        upsCost *= (0.9 + random.nextDouble() * 0.2);

        if (uspsCost <= fedexCost && uspsCost <= upsCost) {
            return new CarrierRate("USPS", uspsCost);
        } else if (fedexCost <= uspsCost && fedexCost <= upsCost) {
            return new CarrierRate("FedEx", fedexCost);
        } else {
            return new CarrierRate("UPS", upsCost);
        }
    }
}
