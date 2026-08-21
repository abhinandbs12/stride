package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderStatus;

public final class OrderStateFactory {

    private OrderStateFactory() {}

    public static OrderState fromStatus(OrderStatus status) {
        return switch (status) {
            case CREATED -> new CreatedState();
            case ALLOCATED -> new AllocatedState();
            case PARTIALLY_ALLOCATED -> new PartiallyAllocatedState();
            case CONFIRMED -> new ConfirmedState();
            case PICKED -> new PickedState();
            case SHIPPED -> new ShippedState();
            case DELIVERED -> new DeliveredState();
            case CANCELLED -> new CancelledState();
        };
    }
}
