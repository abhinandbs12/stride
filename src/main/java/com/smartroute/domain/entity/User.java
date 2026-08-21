package com.smartroute.domain.entity;

import com.smartroute.domain.enums.Role;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * User entity — Spec §7.2.8.
 * Roles: ADMIN, WH_MANAGER, SUPPLIER.
 * WH_MANAGER has many-to-many with Warehouse for scoped access (FR-1.3).
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(length = 30)
    private String phone;

    @Column(name = "refresh_token_hash")
    private String refreshTokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany
    @JoinTable(
        name = "warehouse_manager",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "warehouse_id")
    )
    private List<Warehouse> assignedWarehouses = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    // --- Getters and Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRefreshTokenHash() { return refreshTokenHash; }
    public void setRefreshTokenHash(String refreshTokenHash) { this.refreshTokenHash = refreshTokenHash; }

    public Instant getCreatedAt() { return createdAt; }

    public List<Warehouse> getAssignedWarehouses() { return assignedWarehouses; }
    public void setAssignedWarehouses(List<Warehouse> assignedWarehouses) { this.assignedWarehouses = assignedWarehouses; }
}
