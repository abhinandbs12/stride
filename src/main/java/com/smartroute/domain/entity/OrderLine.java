package com.smartroute.domain.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * OrderLine entity — Spec §7.2.6.
 * Links an order to a product with requested quantity.
 * Allocations are populated after routing runs.
 */
@Entity
@Table(name = "order_line")
public class OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity_requested", nullable = false)
    private int quantityRequested;

    @OneToMany(mappedBy = "orderLine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderAllocation> allocations = new ArrayList<>();

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public int getQuantityRequested() { return quantityRequested; }
    public void setQuantityRequested(int quantityRequested) { this.quantityRequested = quantityRequested; }

    public List<OrderAllocation> getAllocations() { return allocations; }
    public void setAllocations(List<OrderAllocation> allocations) { this.allocations = allocations; }

    public void addAllocation(OrderAllocation allocation) {
        allocations.add(allocation);
        allocation.setOrderLine(this);
    }
}
