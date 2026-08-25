package com.smartroute.service;

import com.smartroute.domain.entity.Product;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.StockTransfer;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.repository.ProductRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.StockTransferRepository;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.web.dto.request.CreateStockTransferRequest;
import com.smartroute.web.dto.response.StockTransferResponse;
import com.smartroute.web.exception.ApiException;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StockTransferService {

    private final StockTransferRepository transferRepository;
    private final StockItemRepository stockItemRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    public StockTransferService(StockTransferRepository transferRepository,
                                StockItemRepository stockItemRepository,
                                WarehouseRepository warehouseRepository,
                                ProductRepository productRepository,
                                AuditService auditService) {
        this.transferRepository = transferRepository;
        this.stockItemRepository = stockItemRepository;
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StockTransferResponse> getAllTransfers() {
        return transferRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public StockTransferResponse initiateTransfer(CreateStockTransferRequest req) {
        if (req.sourceWarehouseId().equals(req.targetWarehouseId())) {
            throw new ApiException("Source and target warehouse cannot be identical", HttpStatus.BAD_REQUEST, "INVALID_TRANSFER") {};
        }

        Warehouse source = warehouseRepository.findById(req.sourceWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse", req.sourceWarehouseId()));
        Warehouse target = warehouseRepository.findById(req.targetWarehouseId())
                .orElseThrow(() -> new EntityNotFoundException("Warehouse", req.targetWarehouseId()));
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new EntityNotFoundException("Product", req.productId()));

        StockItem sourceStock = stockItemRepository.findByWarehouseIdAndProductId(req.sourceWarehouseId(), req.productId())
                .orElseThrow(() -> new ApiException("Source warehouse does not stock this product", HttpStatus.NOT_FOUND, "STOCK_NOT_FOUND") {});

        if (sourceStock.getAvailableToPromise() < req.quantity()) {
            throw new ApiException("Insufficient available stock at source warehouse", HttpStatus.CONFLICT, "INSUFFICIENT_STOCK") {};
        }

        // Reserve stock at source using guarded domain method
        sourceStock.reserve(req.quantity());
        stockItemRepository.save(sourceStock);

        StockTransfer transfer = new StockTransfer();
        transfer.setSourceWarehouse(source);
        transfer.setTargetWarehouse(target);
        transfer.setProduct(product);
        transfer.setQuantity(req.quantity());
        transfer.setStatus("IN_TRANSIT");
        transfer.setTrackingRef("TRF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        StockTransfer saved = transferRepository.save(transfer);

        auditService.log("STOCK_TRANSFER_INITIATED", "StockTransfer", saved.getId(),
                Map.of("from", source.getName(), "to", target.getName(), "qty", req.quantity()));

        return toResponse(saved);
    }

    @Transactional
    public StockTransferResponse completeTransfer(UUID transferId) {
        StockTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new EntityNotFoundException("StockTransfer", transferId));

        if (!"IN_TRANSIT".equals(transfer.getStatus())) {
            throw new ApiException("Transfer is not in IN_TRANSIT status", HttpStatus.CONFLICT, "ILLEGAL_STATE") {};
        }

        // 1. Deduct from source
        StockItem sourceStock = stockItemRepository.findByWarehouseIdAndProductId(
                transfer.getSourceWarehouse().getId(), transfer.getProduct().getId())
                .orElseThrow(() -> new EntityNotFoundException("StockItem", "source"));
        sourceStock.deduct(transfer.getQuantity());
        stockItemRepository.save(sourceStock);

        // 2. Add to target
        StockItem targetStock = stockItemRepository.findByWarehouseIdAndProductId(
                transfer.getTargetWarehouse().getId(), transfer.getProduct().getId())
                .orElseGet(() -> {
                    StockItem created = new StockItem();
                    created.setWarehouse(transfer.getTargetWarehouse());
                    created.setProduct(transfer.getProduct());
                    created.setQuantity(0);
                    return created;
                });

        targetStock.setQuantity(targetStock.getQuantity() + transfer.getQuantity());
        stockItemRepository.save(targetStock);

        transfer.setStatus("COMPLETED");
        StockTransfer saved = transferRepository.save(transfer);

        auditService.log("STOCK_TRANSFER_COMPLETED", "StockTransfer", saved.getId(),
                Map.of("from", transfer.getSourceWarehouse().getName(), "to", transfer.getTargetWarehouse().getName(), "qty", transfer.getQuantity()));

        return toResponse(saved);
    }

    private StockTransferResponse toResponse(StockTransfer t) {
        return new StockTransferResponse(
                t.getId(),
                t.getSourceWarehouse().getId(),
                t.getSourceWarehouse().getName(),
                t.getTargetWarehouse().getId(),
                t.getTargetWarehouse().getName(),
                t.getProduct().getId(),
                t.getProduct().getName(),
                t.getProduct().getSku(),
                t.getQuantity(),
                t.getStatus(),
                t.getTrackingRef(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
