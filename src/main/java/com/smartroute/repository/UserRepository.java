package com.smartroute.repository;

import com.smartroute.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Checks if a user is assigned to a specific warehouse.
     * Used by WarehouseAccessGuard for SpEL-based @PreAuthorize checks (Arch Ref §9.3).
     */
    @Query("SELECT CASE WHEN COUNT(w) > 0 THEN true ELSE false END " +
           "FROM User u JOIN u.assignedWarehouses w " +
           "WHERE u.id = :userId AND w.id = :warehouseId")
    boolean isAssignedToWarehouse(@Param("userId") UUID userId,
                                  @Param("warehouseId") UUID warehouseId);
}
