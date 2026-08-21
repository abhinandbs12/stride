package com.smartroute.repository;

import com.smartroute.domain.entity.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    Page<Warehouse> findByActiveTrue(Pageable pageable);

    Optional<Warehouse> findByName(String name);
}
