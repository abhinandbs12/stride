package com.smartroute.routing;

import com.smartroute.config.RoutingProperties;
import com.smartroute.routing.model.AllocationEntry;
import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.routing.model.LineRequest;
import com.smartroute.routing.model.StockSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ConsolidationPlannerTest {

    private ConsolidationPlanner planner;
    private RoutingProperties props;

    @BeforeEach
    void setUp() {
        props = new RoutingProperties(
            new RoutingProperties.Weights(0.4, 0.3, 0.3), // Not heavily used here, but needed for context
            0.05,
            15,
            300.0 // Max split distance
        );
        planner = new ConsolidationPlanner(props);
    }

    @Test
    void shouldFulfillFromSingleWarehouseIfPossible() {
        // Given
        double custLat = 12.9716;
        double custLng = 77.5946;

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        
        List<LineRequest> lines = List.of(
            new LineRequest(p1, 10),
            new LineRequest(p2, 5)
        );

        UUID wh1 = UUID.randomUUID(); // Has both items
        StockSnapshot snap1 = new StockSnapshot(wh1, p1, 20, 12.91, 77.64, 1.0);
        StockSnapshot snap2 = new StockSnapshot(wh1, p2, 20, 12.91, 77.64, 1.0);

        UUID wh2 = UUID.randomUUID(); // Has both items but is further away
        StockSnapshot snap3 = new StockSnapshot(wh2, p1, 20, 13.08, 80.27, 1.0);
        StockSnapshot snap4 = new StockSnapshot(wh2, p2, 20, 13.08, 80.27, 1.0);

        // When
        AllocationPlan plan = planner.route(custLat, custLng, lines, List.of(snap1, snap2, snap3, snap4));

        // Then
        assertThat(plan.backorderedByProduct()).isEmpty();
        assertThat(plan.entries()).hasSize(2);
        
        // Both items should come from wh1 because it has both and is closer
        assertThat(plan.entries()).allMatch(e -> e.warehouseId().equals(wh1));
    }

    @Test
    void shouldConsolidateFromTwoWarehousesIfNecessary() {
        // Given
        double custLat = 12.9716;
        double custLng = 77.5946;

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        
        List<LineRequest> lines = List.of(
            new LineRequest(p1, 10),
            new LineRequest(p2, 5)
        );

        UUID wh1 = UUID.randomUUID(); // Only has p1
        StockSnapshot snap1 = new StockSnapshot(wh1, p1, 20, 12.91, 77.64, 1.0);

        UUID wh2 = UUID.randomUUID(); // Only has p2
        StockSnapshot snap2 = new StockSnapshot(wh2, p2, 20, 13.08, 80.27, 1.0);

        // When
        AllocationPlan plan = planner.route(custLat, custLng, lines, List.of(snap1, snap2));

        // Then
        assertThat(plan.backorderedByProduct()).isEmpty();
        assertThat(plan.entries()).hasSize(2);
        
        // One should come from wh1, one from wh2
        assertThat(plan.entries()).anyMatch(e -> e.warehouseId().equals(wh1) && e.productId().equals(p1));
        assertThat(plan.entries()).anyMatch(e -> e.warehouseId().equals(wh2) && e.productId().equals(p2));
    }
}
