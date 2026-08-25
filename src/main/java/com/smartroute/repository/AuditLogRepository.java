package com.smartroute.repository;

import com.smartroute.domain.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId, Pageable pageable);
    Page<AuditLog> findByActorEmail(String actorEmail, Pageable pageable);
    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);
}
