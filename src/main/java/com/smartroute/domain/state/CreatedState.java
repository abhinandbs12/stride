package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;

public final class CreatedState implements OrderState {
    @Override
    public OrderState onEvent(OrderEvent event) {
        return switch (event) {
            case ROUTED_FULL -> new AllocatedState();
            case ROUTED_PARTIAL -> new PartiallyAllocatedState();
            case CANCEL -> new CancelledState();
            default -> invalidTransition(event);
        };
    }

    @Override
    public OrderStatus status() {
        return OrderStatus.CREATED;
    }
}
