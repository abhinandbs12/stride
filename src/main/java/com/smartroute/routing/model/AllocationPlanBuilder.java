package com.smartroute.routing.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AllocationPlanBuilder {
    private final List<AllocationEntry> entries = new ArrayList<>();
    private final Map<UUID, Integer> backordered = new HashMap<>();

    public AllocationPlanBuilder addEntry(AllocationEntry entry) {
        entries.add(entry);
        return this;
    }

    public AllocationPlanBuilder addBackorder(UUID productId, int qty) {
        backordered.merge(productId, qty, Integer::sum);
        return this;
    }

    public AllocationPlan build() {
        return new AllocationPlan(List.copyOf(entries), Map.copyOf(backordered));
    }
}
