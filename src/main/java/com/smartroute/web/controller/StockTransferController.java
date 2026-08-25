package com.smartroute.web.controller;

import com.smartroute.service.StockTransferService;
import com.smartroute.web.dto.request.CreateStockTransferRequest;
import com.smartroute.web.dto.response.StockTransferResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock/transfers")
public class StockTransferController {

    private final StockTransferService transferService;

    public StockTransferController(StockTransferService transferService) {
        this.transferService = transferService;
    }

    @GetMapping
    public List<StockTransferResponse> getAllTransfers() {
        return transferService.getAllTransfers();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN') or hasRole('WH_MANAGER')")
    public StockTransferResponse initiateTransfer(@Valid @RequestBody CreateStockTransferRequest req) {
        return transferService.initiateTransfer(req);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WH_MANAGER')")
    public StockTransferResponse completeTransfer(@PathVariable UUID id) {
        return transferService.completeTransfer(id);
    }
}
