package com.smartroute.domain.state;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.web.exception.IllegalStateTransitionException;

/**
 * State Pattern for Order Lifecycle. (Spec §8.4)
 */
public interface OrderState {
    
    OrderState onEvent(OrderEvent event);
    
    OrderStatus status();

    default OrderState invalidTransition(OrderEvent event) {
        throw new IllegalStateTransitionException(status(), event);
    }
}
