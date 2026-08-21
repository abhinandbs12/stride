package com.smartroute.web.controller;

import com.smartroute.service.StockService;
import com.smartroute.web.dto.request.AdjustQuantityRequest;
import com.smartroute.web.dto.request.CreateStockItemRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.StockItemResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WH_MANAGER')")
    public PageResponse<StockItemResponse> getAll(
            @RequestParam(required = false) UUID warehouseId,
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) Boolean belowThreshold,
            Pageable pageable) {
        return stockService.findAll(warehouseId, productId, belowThreshold, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN') or (hasRole('WH_MANAGER') and @warehouseGuard.canAccess(#req.warehouseId, authentication))")
    public StockItemResponse createOrUpdate(@Valid @RequestBody CreateStockItemRequest req) {
        return stockService.createOrUpdate(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StockItemResponse adjustQuantity(@PathVariable UUID id, @Valid @RequestBody AdjustQuantityRequest req) {
        return stockService.adjustQuantity(id, req);
    }
}
