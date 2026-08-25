package com.smartroute.web.controller;

import com.smartroute.domain.entity.AuditLog;
import com.smartroute.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public Page<AuditLog> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(required = false) String actorEmail,
            Pageable pageable) {
        if (entityType != null && entityId != null) {
            return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId, pageable);
        } else if (entityType != null) {
            return auditLogRepository.findByEntityType(entityType, pageable);
        } else if (actorEmail != null) {
            return auditLogRepository.findByActorEmail(actorEmail, pageable);
        }
        return auditLogRepository.findAll(pageable);
    }
}
