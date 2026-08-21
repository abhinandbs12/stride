package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;

public final class CancelledState implements OrderState {
    @Override
    public OrderState onEvent(OrderEvent event) {
        return invalidTransition(event); // Terminal state
    }

    @Override
    public OrderStatus status() {
        return OrderStatus.CANCELLED;
    }
}
