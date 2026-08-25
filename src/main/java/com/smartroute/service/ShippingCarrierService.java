package com.smartroute.service;

import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class ShippingCarrierService {

    private final Random random = new Random();

    public record CarrierRate(
        String carrierName, 
        double cost, 
        double carbonKg, 
        String transportMode
    ) {}

    /**
     * Calculates dynamic real-world carrier rates and Scope 3 carbon footprint (kg CO2).
     */
    public CarrierRate getBestCarrier(double distanceKm, double totalWeightKg) {
        double uspsBase = 5.0;
        double fedexBase = 12.0;
        double upsBase = 9.0;

        // Cost modeling
        double uspsCost = uspsBase + (distanceKm * 0.05) + (totalWeightKg * 1.2);
        double fedexCost = fedexBase + (distanceKm * 0.02) + (totalWeightKg * 0.8);
        double upsCost = upsBase + (distanceKm * 0.035) + (totalWeightKg * 1.0);

        // Real-world market rate fluctuation (+/- 10%)
        uspsCost *= (0.9 + random.nextDouble() * 0.2);
        fedexCost *= (0.9 + random.nextDouble() * 0.2);
        upsCost *= (0.9 + random.nextDouble() * 0.2);

        // Carbon modeling (kg CO2 per ton-km conversion)
        double uspsCarbon = (distanceKm * Math.max(1.0, totalWeightKg) * 0.000095); // Eco-Ground
        double fedexCarbon = (distanceKm * Math.max(1.0, totalWeightKg) * 0.000580); // Air Express
        double upsCarbon = (distanceKm * Math.max(1.0, totalWeightKg) * 0.000120); // Standard Ground

        if (uspsCost <= fedexCost && uspsCost <= upsCost) {
            return new CarrierRate("USPS", Math.round(uspsCost * 100.0) / 100.0, Math.round(uspsCarbon * 1000.0) / 1000.0, "EV / Regional Ground");
        } else if (fedexCost <= uspsCost && fedexCost <= upsCost) {
            return new CarrierRate("FedEx", Math.round(fedexCost * 100.0) / 100.0, Math.round(fedexCarbon * 1000.0) / 1000.0, "Priority Air Freight");
        } else {
            return new CarrierRate("UPS", Math.round(upsCost * 100.0) / 100.0, Math.round(upsCarbon * 1000.0) / 1000.0, "Standard Freight Ground");
        }
    }

    /**
     * Estimates carbon footprint for a given route and carrier.
     */
    public double estimateCarbon(double distanceKm, double weightKg, String carrierName) {
        if (carrierName != null && carrierName.contains("FedEx")) {
            return distanceKm * Math.max(1.0, weightKg) * 0.000580;
        } else if (carrierName != null && carrierName.contains("USPS")) {
            return distanceKm * Math.max(1.0, weightKg) * 0.000095;
        }
        return distanceKm * Math.max(1.0, weightKg) * 0.000120;
    }
}
