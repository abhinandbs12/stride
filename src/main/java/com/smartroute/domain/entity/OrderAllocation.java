package com.smartroute.domain.entity;

import com.smartroute.domain.enums.AllocationStatus;
import jakarta.persistence.*;
import java.util.UUID;

/**
 * OrderAllocation entity — Spec §7.2.7.
 * The entity that makes ORDER SPLITTING possible — the direct output
 * of the routing algorithm.
 * 
 * Each allocation ties an order line to a specific warehouse with a
 * quantity and the score breakdown that explains WHY this warehouse
 * was chosen (NFR-2 explainability).
 */
@Entity
@Table(name = "order_allocation")
public class OrderAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_line_id", nullable = false)
    private OrderLine orderLine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "quantity_allocated", nullable = false)
    private int quantityAllocated;

    /**
     * Serialized score components — supports NFR-2 (explainability).
     * Stored as JSONB in PostgreSQL.
     */
    @Column(name = "score_breakdown", columnDefinition = "jsonb")
    private String scoreBreakdown;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AllocationStatus status = AllocationStatus.ALLOCATED;

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public OrderLine getOrderLine() { return orderLine; }
    public void setOrderLine(OrderLine orderLine) { this.orderLine = orderLine; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public int getQuantityAllocated() { return quantityAllocated; }
    public void setQuantityAllocated(int quantityAllocated) { this.quantityAllocated = quantityAllocated; }

    public String getScoreBreakdown() { return scoreBreakdown; }
    public void setScoreBreakdown(String scoreBreakdown) { this.scoreBreakdown = scoreBreakdown; }

    public AllocationStatus getStatus() { return status; }
    public void setStatus(AllocationStatus status) { this.status = status; }
}
