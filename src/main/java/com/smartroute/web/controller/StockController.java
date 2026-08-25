package com.smartroute.web.controller;

import com.smartroute.service.CsvImportExportService;
import com.smartroute.service.StockService;
import com.smartroute.web.dto.request.AdjustQuantityRequest;
import com.smartroute.web.dto.request.CreateStockItemRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.StockItemResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock")
public class StockController {

    private final StockService stockService;
    private final CsvImportExportService csvService;

    public StockController(StockService stockService, CsvImportExportService csvService) {
        this.stockService = stockService;
        this.csvService = csvService;
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

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> importCsv(@RequestParam("file") MultipartFile file) throws Exception {
        int count = csvService.importCsv(file.getInputStream());
        return Map.of("imported", count, "status", "success");
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportCsv() {
        String csv = csvService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=stock_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
