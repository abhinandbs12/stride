package com.smartroute.web.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class EntityNotFoundException extends ApiException {
    
    public EntityNotFoundException(String entityName, UUID id) {
        super(entityName + " not found with id: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    public EntityNotFoundException(String entityName, String identifier) {
        super(entityName + " not found: " + identifier, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }
}
