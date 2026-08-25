package com.smartroute.repository;

import com.smartroute.domain.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, UUID> {
    List<StockTransfer> findByStatus(String status);
    List<StockTransfer> findBySourceWarehouseIdOrTargetWarehouseId(UUID sourceId, UUID targetId);
}
