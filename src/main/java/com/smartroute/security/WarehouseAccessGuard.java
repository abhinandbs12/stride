package com.smartroute.security;

import com.smartroute.repository.OrderAllocationRepository;
import com.smartroute.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Validates whether a user has access to a specific warehouse.
 * Expected to be called from @PreAuthorize("@warehouseGuard.canAccess(...)") SpEL.
 * Exact implementation from Arch Ref §9.3.
 */
@Component("warehouseGuard")
public class WarehouseAccessGuard {

    private final UserRepository userRepository;
    private final OrderAllocationRepository allocationRepository;

    public WarehouseAccessGuard(UserRepository userRepository, OrderAllocationRepository allocationRepository) {
        this.userRepository = userRepository;
        this.allocationRepository = allocationRepository;
    }

    public boolean canAccess(UUID warehouseId, Authentication principal) {
        if (principal == null || !(principal.getPrincipal() instanceof JwtPrincipal jwtPrincipal)) {
            return false;
        }
        return userRepository.isAssignedToWarehouse(jwtPrincipal.userId(), warehouseId);
    }

    public boolean canAccessAllocation(UUID allocationId, Authentication principal) {
        UUID warehouseId = allocationRepository.findWarehouseIdById(allocationId);
        if (warehouseId == null) {
            return false;
        }
        return canAccess(warehouseId, principal);
    }
}
