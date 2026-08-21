package com.smartroute.repository;

import com.smartroute.domain.entity.OrderLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrderLineRepository extends JpaRepository<OrderLine, UUID> {
}
