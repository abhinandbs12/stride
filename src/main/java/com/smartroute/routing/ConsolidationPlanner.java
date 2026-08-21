package com.smartroute.routing;

import com.smartroute.config.RoutingProperties;
import com.smartroute.routing.model.AllocationEntry;
import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.routing.model.LineRequest;
import com.smartroute.routing.model.ScoreBreakdown;
import com.smartroute.routing.model.StockSnapshot;

import java.util.*;

public final class ConsolidationPlanner {

    private ConsolidationPlanner() {}

    public static AllocationPlan tryConsolidate(double customerLat, double customerLng,
                                                List<LineRequest> lines,
                                                List<StockSnapshot> allCandidates,
                                                AllocationPlan baseline,
                                                RoutingProperties props) {
        
        List<UUID> candidateWarehouses = allCandidates.stream()
            .map(StockSnapshot::warehouseId)
            .distinct()
            .limit(15) // hard limit for bitmask DP
            .toList();
            
        int k = candidateWarehouses.size();
        if (k == 0 || k > 15) return null; // guard against explosion

        double bestScore = Double.MAX_VALUE;
        AllocationPlan bestPlan = null;

        for (int mask = 1; mask < (1 << k); mask++) {
            List<UUID> subset = warehousesInMask(mask, candidateWarehouses);
            AllocationPlan attempt = allocateWithinSubset(customerLat, customerLng, lines, allCandidates, subset, props);
            if (attempt == null) continue;
            
            if (totalBackordered(attempt) > totalBackordered(baseline)) continue;
            
            double score = totalRawScore(attempt, props) - props.consolidationBeta() * (15 - Integer.bitCount(mask));
            if (score < bestScore) {
                bestScore = score;
                bestPlan = attempt;
            }
        }
        return bestPlan;
    }

    private static List<UUID> warehousesInMask(int mask, List<UUID> all) {
        List<UUID> result = new ArrayList<>();
        for (int i = 0; i < all.size(); i++) {
            if ((mask & (1 << i)) != 0) result.add(all.get(i));
        }
        return result;
    }

    private static AllocationPlan allocateWithinSubset(double customerLat, double customerLng,
                                                       List<LineRequest> lines,
                                                       List<StockSnapshot> allCandidates,
                                                       List<UUID> subset,
                                                       RoutingProperties props) {
        List<AllocationEntry> entries = new ArrayList<>();
        Map<UUID, Integer> backordered = new HashMap<>();

        for (LineRequest line : lines) {
            List<StockSnapshot> candidates = allCandidates.stream()
                .filter(s -> s.productId().equals(line.productId()) && s.available() > 0)
                .filter(s -> subset.contains(s.warehouseId()))
                .filter(s -> DistanceCostStrategy.haversineKm(s.latitude(), s.longitude(), customerLat, customerLng) <= props.maxCandidateRadiusKm())
                .toList();

            if (candidates.isEmpty()) {
                backordered.merge(line.productId(), line.quantityRequested(), Integer::sum);
                continue;
            }

            int remaining = line.quantityRequested();
            final int reqQty = remaining;
            double minDist = candidates.stream().mapToDouble(s -> DistanceCostStrategy.haversineKm(s.latitude(), s.longitude(), customerLat, customerLng)).min().orElse(0);
            double maxDist = candidates.stream().mapToDouble(s -> DistanceCostStrategy.haversineKm(s.latitude(), s.longitude(), customerLat, customerLng)).max().orElse(0);
            double minCost = candidates.stream().mapToDouble(StockSnapshot::costFactor).min().orElse(0);
            double maxCost = candidates.stream().mapToDouble(StockSnapshot::costFactor).max().orElse(0);

            List<StockSnapshot> ranked = candidates.stream()
                .sorted(Comparator.comparingDouble(s -> scoreOf(s, customerLat, customerLng, reqQty, minDist, maxDist, minCost, maxCost, props)))
                .toList();

            for (StockSnapshot s : ranked) {
                if (remaining <= 0) break;
                int take = Math.min(remaining, s.available());
                if (take <= 0) continue;
                
                ScoreBreakdown breakdown = breakdownOf(s, customerLat, customerLng, remaining, minDist, maxDist, minCost, maxCost);
                entries.add(new AllocationEntry(s.warehouseId(), s.productId(), take, breakdown));
                remaining -= take;
            }
            if (remaining > 0) {
                backordered.merge(line.productId(), remaining, Integer::sum);
            }
        }
        return new AllocationPlan(entries, backordered);
    }

    private static double scoreOf(StockSnapshot s, double lat, double lng, int needed,
                                  double minDist, double maxDist, double minCost, double maxCost,
                                  RoutingProperties props) {
        return breakdownOf(s, lat, lng, needed, minDist, maxDist, minCost, maxCost)
                .total(props.weights().distance(), props.weights().cost(), props.weights().shortfall());
    }

    private static ScoreBreakdown breakdownOf(StockSnapshot s, double lat, double lng, int needed,
                                              double minDist, double maxDist, double minCost, double maxCost) {
        double dist = DistanceCostStrategy.haversineKm(s.latitude(), s.longitude(), lat, lng);
        double dNorm = (maxDist == minDist) ? 0.5 : (dist - minDist) / (maxDist - minDist);
        double cNorm = (maxCost == minCost) ? 0.5 : (s.costFactor() - minCost) / (maxCost - minCost);
        double shortfall = Math.max(0, (needed - s.available()) / (double) needed);
        return new ScoreBreakdown(dNorm, cNorm, shortfall);
    }

    private static int totalBackordered(AllocationPlan plan) {
        return plan.backorderedByProduct().values().stream().mapToInt(Integer::intValue).sum();
    }

    private static double totalRawScore(AllocationPlan plan, RoutingProperties props) {
        return plan.entries().stream()
            .mapToDouble(e -> e.breakdown().total(props.weights().distance(), props.weights().cost(), props.weights().shortfall()))
            .sum();
    }
}
