package com.smartroute.repository;

import com.smartroute.domain.entity.Order;
import com.smartroute.domain.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByCustomerId(UUID customerId, Pageable pageable);

    Page<Order> findByStatusAndCreatedAtBetween(OrderStatus status, Instant from, Instant to, Pageable pageable);
}
