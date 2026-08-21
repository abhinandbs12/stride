package com.smartroute.web.controller;

import com.smartroute.service.WarehouseService;
import com.smartroute.web.dto.request.CreateWarehouseRequest;
import com.smartroute.web.dto.request.UpdateWarehouseRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.WarehouseResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouses")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WH_MANAGER')")
    public PageResponse<WarehouseResponse> getAll(Pageable pageable) {
        return warehouseService.findAllActive(pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public WarehouseResponse create(@Valid @RequestBody CreateWarehouseRequest req) {
        return warehouseService.create(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public WarehouseResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateWarehouseRequest req) {
        return warehouseService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        warehouseService.softDelete(id);
    }
}
