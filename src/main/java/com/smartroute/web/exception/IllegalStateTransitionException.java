package com.smartroute.web.exception;

import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;
import org.springframework.http.HttpStatus;

public class IllegalStateTransitionException extends ApiException {
    
    public IllegalStateTransitionException(OrderStatus from, OrderEvent event) {
        super(
            String.format("Cannot process event %s from state %s", event, from),
            HttpStatus.CONFLICT,
            "ILLEGAL_STATE_TRANSITION"
        );
    }
}
