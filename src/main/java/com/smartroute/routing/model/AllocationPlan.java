package com.smartroute.routing.model;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AllocationPlan(
    List<AllocationEntry> entries,
    Map<UUID, Integer> backorderedByProduct
) {}
