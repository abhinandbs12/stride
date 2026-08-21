package com.smartroute.domain.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * Product entity — Spec §7.2.2.
 * reorderThreshold: per-product default for reorder alerts (FR-5).
 */
@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false, length = 100)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(length = 100)
    private String category;

    @Column(name = "unit_weight_kg")
    private Double unitWeightKg;

    @Column(name = "reorder_threshold", nullable = false)
    private int reorderThreshold = 10;

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getUnitWeightKg() { return unitWeightKg; }
    public void setUnitWeightKg(Double unitWeightKg) { this.unitWeightKg = unitWeightKg; }

    public int getReorderThreshold() { return reorderThreshold; }
    public void setReorderThreshold(int reorderThreshold) { this.reorderThreshold = reorderThreshold; }
}
