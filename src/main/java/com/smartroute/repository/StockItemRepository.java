package com.smartroute.repository;

import com.smartroute.domain.entity.StockItem;
import com.smartroute.routing.model.StockSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The most complex repository — Arch Ref §3.5.
 */
@Repository
public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

    Optional<StockItem> findByWarehouseIdAndProductId(UUID warehouseId, UUID productId);

    /**
     * Returns StockSnapshot projections for the routing algorithm.
     * Only active warehouses with available-to-promise > 0.
     * This is the read that gets re-executed on every retry (Spec §12.3).
     */
    @Query("SELECT new com.smartroute.routing.model.StockSnapshot(" +
           "si.warehouse.id, si.product.id, (si.quantity - si.reservedQuantity), " +
           "si.warehouse.latitude, si.warehouse.longitude, si.warehouse.costFactor) " +
           "FROM StockItem si " +
           "WHERE si.warehouse.active = true " +
           "AND si.product.id IN :productIds " +
           "AND (si.quantity - si.reservedQuantity) > 0")
    List<StockSnapshot> findCandidateSnapshots(@Param("productIds") List<UUID> productIds);

    /**
     * For reorder alerts — finds stock items below their product's reorder threshold.
     * Spec §18: stock_item JOIN product WHERE quantity < reorder_threshold.
     */
    @Query("SELECT si FROM StockItem si " +
           "JOIN FETCH si.product " +
           "JOIN FETCH si.warehouse " +
           "WHERE si.quantity < si.product.reorderThreshold")
    List<StockItem> findBelowThreshold();

    Page<StockItem> findByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<StockItem> findByProductId(UUID productId, Pageable pageable);

    /**
     * For reporting — stock items below threshold with pagination.
     */
    @Query("SELECT si FROM StockItem si " +
           "JOIN FETCH si.product " +
           "WHERE si.quantity < si.product.reorderThreshold")
    Page<StockItem> findBelowThreshold(Pageable pageable);

    Optional<StockItem> findByWarehouse_IdAndProduct_Id(UUID warehouseId, UUID productId);
}
