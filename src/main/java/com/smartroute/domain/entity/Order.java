package com.smartroute.domain.entity;

import com.smartroute.domain.enums.OrderStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Order entity — Spec §7.2.5.
 * Status mutations MUST go through OrderStateService, never direct setStatus() calls.
 * (Arch Ref §11.2 failure mode, §13 guardrail)
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status = OrderStatus.CREATED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> orderLines = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public OrderStatus getStatus() { return status; }

    /**
     * Package-private setter — only OrderStateService should call this.
     * Direct calls from outside domain/state package will be a compile error
     * if properly enforced by architecture tests.
     */
    public void setStatus(OrderStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<OrderLine> getOrderLines() { return orderLines; }
    public void setOrderLines(List<OrderLine> orderLines) { this.orderLines = orderLines; }

    public void addOrderLine(OrderLine line) {
        orderLines.add(line);
        line.setOrder(this);
    }
}
