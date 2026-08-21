package com.smartroute.web.exception;

import org.springframework.http.HttpStatus;

public abstract class ApiException extends RuntimeException {
    
    private final HttpStatus httpStatus;
    private final String errorCode;

    protected ApiException(String message, HttpStatus httpStatus, String errorCode) {
        super(message);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    protected ApiException(String message, Throwable cause, HttpStatus httpStatus, String errorCode) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
