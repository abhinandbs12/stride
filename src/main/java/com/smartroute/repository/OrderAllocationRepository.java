package com.smartroute.repository;

import com.smartroute.domain.entity.OrderAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderAllocationRepository extends JpaRepository<OrderAllocation, UUID> {

    List<OrderAllocation> findByOrderLineOrderId(UUID orderId);

    /**
     * Used by WarehouseAccessGuard to enforce warehouse-scoped access (Arch Ref §9.3).
     */
    @Query("SELECT oa.warehouse.id FROM OrderAllocation oa WHERE oa.id = :allocationId")
    UUID findWarehouseIdById(@Param("allocationId") UUID allocationId);
}
