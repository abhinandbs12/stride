package com.smartroute.domain.enums;

/**
 * Events that trigger order state transitions — see Spec §8.3.
 */
public enum OrderEvent {
    ROUTED_FULL,
    ROUTED_PARTIAL,
    CONFIRM,
    PICK,
    SHIP,
    DELIVER,
    CANCEL
}
