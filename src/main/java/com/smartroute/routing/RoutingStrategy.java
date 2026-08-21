package com.smartroute.routing;

import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.routing.model.LineRequest;
import com.smartroute.routing.model.StockSnapshot;

import java.util.List;

/**
 * PURE FUNCTION BOUNDARY.
 * Must not depend on any Spring or JPA annotations/classes.
 * Receives plain records, returns plain records.
 */
public interface RoutingStrategy {

    AllocationPlan route(double customerLat, double customerLng,
                         List<LineRequest> lines, List<StockSnapshot> candidates);
}
