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

class DistanceCostStrategyTest {

    private DistanceCostStrategy strategy;
    private RoutingProperties props;

    @BeforeEach
    void setUp() {
        props = new RoutingProperties(
            new RoutingProperties.Weights(0.4, 0.3, 0.3),
            0.05,
            15,
            300.0
        );
        strategy = new DistanceCostStrategy(props);
    }

    @Test
    void shouldRouteToClosestWarehouseWhenCostIsEqual() {
        // Given
        UUID customerId = UUID.randomUUID();
        double custLat = 12.9716;
        double custLng = 77.5946; // Bangalore

        UUID productId = UUID.randomUUID();
        LineRequest line = new LineRequest(productId, 10);

        UUID wh1 = UUID.randomUUID(); // Closer (Bangalore)
        StockSnapshot snap1 = new StockSnapshot(wh1, productId, 20, 12.91, 77.64, 1.0);

        UUID wh2 = UUID.randomUUID(); // Farther (Chennai)
        StockSnapshot snap2 = new StockSnapshot(wh2, productId, 20, 13.08, 80.27, 1.0);

        // When
        AllocationPlan plan = strategy.route(custLat, custLng, List.of(line), List.of(snap1, snap2));

        // Then
        assertThat(plan.backorderedByProduct()).isEmpty();
        assertThat(plan.entries()).hasSize(1);
        
        AllocationEntry entry = plan.entries().get(0);
        assertThat(entry.warehouseId()).isEqualTo(wh1);
        assertThat(entry.quantity()).isEqualTo(10);
    }

    @Test
    void shouldSplitOrderWhenClosestDoesNotHaveEnoughStock() {
        // Given
        double custLat = 12.9716;
        double custLng = 77.5946;

        UUID productId = UUID.randomUUID();
        LineRequest line = new LineRequest(productId, 15);

        UUID wh1 = UUID.randomUUID(); // Closer, but only has 10
        StockSnapshot snap1 = new StockSnapshot(wh1, productId, 10, 12.91, 77.64, 1.0);

        UUID wh2 = UUID.randomUUID(); // Farther, has 20
        StockSnapshot snap2 = new StockSnapshot(wh2, productId, 20, 13.08, 80.27, 1.0);

        // When
        AllocationPlan plan = strategy.route(custLat, custLng, List.of(line), List.of(snap1, snap2));

        // Then
        assertThat(plan.backorderedByProduct()).isEmpty();
        assertThat(plan.entries()).hasSize(2);
        
        assertThat(plan.entries()).anySatisfy(entry -> {
            assertThat(entry.warehouseId()).isEqualTo(wh1);
            assertThat(entry.quantity()).isEqualTo(10);
        });
        
        assertThat(plan.entries()).anySatisfy(entry -> {
            assertThat(entry.warehouseId()).isEqualTo(wh2);
            assertThat(entry.quantity()).isEqualTo(5);
        });
    }

    @Test
    void shouldBackorderWhenTotalStockIsInsufficient() {
        // Given
        double custLat = 12.9716;
        double custLng = 77.5946;

        UUID productId = UUID.randomUUID();
        LineRequest line = new LineRequest(productId, 50);

        UUID wh1 = UUID.randomUUID();
        StockSnapshot snap1 = new StockSnapshot(wh1, productId, 10, 12.91, 77.64, 1.0);

        // When
        AllocationPlan plan = strategy.route(custLat, custLng, List.of(line), List.of(snap1));

        // Then
        assertThat(plan.entries()).hasSize(1);
        assertThat(plan.entries().get(0).quantity()).isEqualTo(10);
        
        assertThat(plan.backorderedByProduct()).containsEntry(productId, 40);
    }
}
