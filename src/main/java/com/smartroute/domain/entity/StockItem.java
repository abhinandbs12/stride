package com.smartroute.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

/**
 * StockItem entity — Spec §7.2.3.
 * THE most critical entity in the system.
 * 
 * @Version field enables optimistic locking — the foundation of
 * STRIDE's concurrency correctness (Spec §12).
 * 
 * All mutations MUST go through guarded methods (reserve, release, deduct).
 * Never use raw setters for quantity/reservedQuantity.
 * (Arch Ref §13 guardrail)
 */
@Entity
@Table(name = "stock_item",
       uniqueConstraints = @UniqueConstraint(columnNames = {"warehouse_id", "product_id"}))
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "reserved_quantity", nullable = false)
    private int reservedQuantity = 0;

    @Column(name = "batch_expiry")
    private LocalDate batchExpiry;

    /**
     * Optimistic locking field — the single most important column in this schema.
     * JPA issues: UPDATE stock_item SET ..., version = version + 1 WHERE id = ? AND version = ?
     * If 0 rows affected → ObjectOptimisticLockingFailureException (Spec §12.2).
     */
    @Version
    private long version;

    // --- Guarded mutation methods (Arch Ref §13 guardrail) ---

    /**
     * Available-to-promise = quantity - reservedQuantity.
     * This is what routing uses, not raw quantity (Spec §12.4).
     */
    public int getAvailableToPromise() {
        return quantity - reservedQuantity;
    }

    /**
     * Reserve stock for an allocation — increments reservedQuantity only.
     * Physical quantity unchanged (nothing has left the building yet).
     * Called during order placement (Spec §12.4: "On allocation").
     */
    public void reserve(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Reserve amount must be positive, got: " + amount);
        }
        if (amount > getAvailableToPromise()) {
            throw new IllegalArgumentException(
                "Cannot reserve " + amount + " — only " + getAvailableToPromise() + " available to promise");
        }
        this.reservedQuantity += amount;
    }

    /**
     * Release reserved stock — decrements reservedQuantity.
     * Called on cancellation before shipment (Spec §12.4: "On cancellation").
     */
    public void release(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Release amount must be positive, got: " + amount);
        }
        if (amount > this.reservedQuantity) {
            throw new IllegalArgumentException(
                "Cannot release " + amount + " — only " + this.reservedQuantity + " reserved");
        }
        this.reservedQuantity -= amount;
    }

    /**
     * Deduct stock on shipment — decrements both quantity and reservedQuantity.
     * Called when allocation is shipped (Spec §12.4: "On shipment").
     */
    public void deduct(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deduct amount must be positive, got: " + amount);
        }
        if (amount > this.quantity) {
            throw new IllegalArgumentException(
                "Cannot deduct " + amount + " — only " + this.quantity + " in stock");
        }
        if (amount > this.reservedQuantity) {
            throw new IllegalArgumentException(
                "Cannot deduct " + amount + " — only " + this.reservedQuantity + " reserved");
        }
        this.quantity -= amount;
        this.reservedQuantity -= amount;
    }

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getReservedQuantity() { return reservedQuantity; }

    public LocalDate getBatchExpiry() { return batchExpiry; }
    public void setBatchExpiry(LocalDate batchExpiry) { this.batchExpiry = batchExpiry; }

    public long getVersion() { return version; }
}
