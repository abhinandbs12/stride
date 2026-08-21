package com.smartroute.web.exception;

import org.springframework.http.HttpStatus;

public class InsufficientStockException extends ApiException {
    
    public InsufficientStockException(String message) {
        super(message, HttpStatus.CONFLICT, "INSUFFICIENT_STOCK");
    }
}
