package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;

public final class ShippedState implements OrderState {
    @Override
    public OrderState onEvent(OrderEvent event) {
        return switch (event) {
            case DELIVER -> new DeliveredState();
            default -> invalidTransition(event);
        };
    }

    @Override
    public OrderStatus status() {
        return OrderStatus.SHIPPED;
    }
}
