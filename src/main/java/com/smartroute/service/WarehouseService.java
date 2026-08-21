package com.smartroute.service;

import com.smartroute.domain.entity.Warehouse;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.web.dto.request.CreateWarehouseRequest;
import com.smartroute.web.dto.request.UpdateWarehouseRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.WarehouseResponse;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseService(WarehouseRepository warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }

    public PageResponse<WarehouseResponse> findAllActive(Pageable pageable) {
        Page<Warehouse> page = warehouseRepository.findByActiveTrue(pageable);
        return new PageResponse<>(
            page.getContent().stream().map(this::mapToResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    @Transactional
    public WarehouseResponse create(CreateWarehouseRequest req) {
        Warehouse w = new Warehouse();
        w.setName(req.name());
        w.setAddress(req.address());
        w.setLatitude(req.latitude());
        w.setLongitude(req.longitude());
        w.setCostFactor(req.costFactor() != null ? req.costFactor() : 1.0);
        
        return mapToResponse(warehouseRepository.save(w));
    }

    @Transactional
    public WarehouseResponse update(UUID id, UpdateWarehouseRequest req) {
        Warehouse w = warehouseRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Warehouse", id));

        if (req.name() != null) w.setName(req.name());
        if (req.address() != null) w.setAddress(req.address());
        if (req.latitude() != null) w.setLatitude(req.latitude());
        if (req.longitude() != null) w.setLongitude(req.longitude());
        if (req.costFactor() != null) w.setCostFactor(req.costFactor());
        if (req.active() != null) w.setActive(req.active());

        return mapToResponse(warehouseRepository.save(w));
    }

    @Transactional
    public void softDelete(UUID id) {
        Warehouse w = warehouseRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Warehouse", id));
        w.setActive(false);
        warehouseRepository.save(w);
    }

    private WarehouseResponse mapToResponse(Warehouse w) {
        return new WarehouseResponse(
            w.getId(), w.getName(), w.getAddress(), w.getLatitude(), w.getLongitude(),
            w.getCostFactor(), w.isActive(), w.getCreatedAt(), w.getUpdatedAt()
        );
    }
}
