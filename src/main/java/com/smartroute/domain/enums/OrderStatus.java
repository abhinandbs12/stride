package com.smartroute.domain.enums;

/**
 * Order lifecycle states — see Spec §8.1.
 *
 * CREATED → ALLOCATED → CONFIRMED → PICKED → SHIPPED → DELIVERED
 *     │                                             
 *     └→ PARTIALLY_ALLOCATED → CONFIRMED → ...      
 *     └→ CANCELLED (from any pre-SHIPPED state)     
 */
public enum OrderStatus {
    CREATED,
    ALLOCATED,
    PARTIALLY_ALLOCATED,
    CONFIRMED,
    PICKED,
    SHIPPED,
    DELIVERED,
    CANCELLED
}
