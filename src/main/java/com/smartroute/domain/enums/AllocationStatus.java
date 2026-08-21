package com.smartroute.domain.enums;

/**
 * Per-allocation status — see Spec §8.2.
 * ALLOCATED → PICKED → SHIPPED
 */
public enum AllocationStatus {
    ALLOCATED,
    PICKED,
    SHIPPED
}
