package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;

public final class PickedState implements OrderState {
    @Override
    public OrderState onEvent(OrderEvent event) {
        return switch (event) {
            case SHIP -> new ShippedState();
            case CANCEL -> new CancelledState();
            default -> invalidTransition(event);
        };
    }

    @Override
    public OrderStatus status() {
        return OrderStatus.PICKED;
    }
}
