package com.smartroute.web.exception;

import org.springframework.http.HttpStatus;

public class StockConflictException extends ApiException {
    
    public StockConflictException(String message, Throwable cause) {
        super(message, cause, HttpStatus.CONFLICT, "STOCK_CONFLICT");
    }
}
