package com.smartroute.routing;

import com.smartroute.config.RoutingProperties;
import com.smartroute.routing.model.AllocationEntry;
import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.routing.model.LineRequest;
import com.smartroute.routing.model.ScoreBreakdown;
import com.smartroute.routing.model.StockSnapshot;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public final class DistanceCostStrategy implements RoutingStrategy {

    private final RoutingProperties props;
    private final com.smartroute.service.ShippingCarrierService carrierService;

    public DistanceCostStrategy(RoutingProperties props, com.smartroute.service.ShippingCarrierService carrierService) {
        this.props = props;
        this.carrierService = carrierService;
    }

    @Override
    public AllocationPlan route(double customerLat, double customerLng,
                                List<LineRequest> lines,
                                List<StockSnapshot> allCandidates) {

        List<AllocationEntry> greedyEntries = new ArrayList<>();
        Map<UUID, Integer> backordered = new HashMap<>();

        // Phase 1 + 2: Per-line greedy
        for (LineRequest line : lines) {
            List<StockSnapshot> candidates = allCandidates.stream()
                .filter(s -> s.productId().equals(line.productId()) && s.available() > 0)
                .filter(s -> distance(s, customerLat, customerLng) <= props.maxCandidateRadiusKm())
                .sorted(Comparator.comparingDouble(s -> distance(s, customerLat, customerLng)))
                .limit(props.maxCandidatesPerLine())
                .toList();

            int remaining = line.quantityRequested();
            final int reqQty = remaining;
            double minDist = candidates.stream().mapToDouble(s -> distance(s, customerLat, customerLng)).min().orElse(0);
            double maxDist = candidates.stream().mapToDouble(s -> distance(s, customerLat, customerLng)).max().orElse(0);
            double minCost = candidates.stream().mapToDouble(s -> carrierService.getBestCarrier(distance(s, customerLat, customerLng), reqQty * 2.0).cost()).min().orElse(0);
            double maxCost = candidates.stream().mapToDouble(s -> carrierService.getBestCarrier(distance(s, customerLat, customerLng), reqQty * 2.0).cost()).max().orElse(0);

            List<StockSnapshot> ranked = candidates.stream()
                .sorted(Comparator.comparingDouble(s ->
                    scoreOf(s, customerLat, customerLng, reqQty, minDist, maxDist, minCost, maxCost)))
                .toList();

            for (StockSnapshot s : ranked) {
                if (remaining <= 0) break;
                int take = Math.min(remaining, s.available());
                if (take <= 0) continue;
                
                ScoreBreakdown breakdown = breakdownOf(s, customerLat, customerLng, remaining,
                    minDist, maxDist, minCost, maxCost);
                
                greedyEntries.add(new AllocationEntry(s.warehouseId(), s.productId(), take, breakdown));
                remaining -= take;
            }
            if (remaining > 0) {
                backordered.merge(line.productId(), remaining, Integer::sum);
            }
        }

        AllocationPlan greedyPlan = new AllocationPlan(greedyEntries, backordered);

        // Phase 3: attempt consolidation
        AllocationPlan consolidated = ConsolidationPlanner.tryConsolidate(
            customerLat, customerLng, lines, allCandidates, greedyPlan, props);
            
        return consolidated != null ? consolidated : greedyPlan;
    }

    private double distance(StockSnapshot s, double lat, double lng) {
        return haversineKm(s.latitude(), s.longitude(), lat, lng);
    }

    private double scoreOf(StockSnapshot s, double lat, double lng, int needed,
                           double minDist, double maxDist, double minCost, double maxCost) {
        return breakdownOf(s, lat, lng, needed, minDist, maxDist, minCost, maxCost)
                .total(props.weights().distance(), props.weights().cost(), props.weights().shortfall());
    }

    private ScoreBreakdown breakdownOf(StockSnapshot s, double lat, double lng, int needed,
                                       double minDist, double maxDist, double minCost, double maxCost) {
        double dist = distance(s, lat, lng);
        double dNorm = (maxDist == minDist) ? 0.5
            : (dist - minDist) / (maxDist - minDist);
        
        // Calculate dynamic real-world carrier cost instead of static costFactor
        double realCost = carrierService.getBestCarrier(dist, needed * 2.0).cost();
        double cNorm = (maxCost == minCost) ? 0.5
            : (realCost - minCost) / (maxCost - minCost);
            
        double shortfall = Math.max(0, (needed - s.available()) / (double) needed);
        return new ScoreBreakdown(dNorm, cNorm, shortfall);
    }

    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
