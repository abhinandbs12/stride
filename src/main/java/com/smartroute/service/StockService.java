package com.smartroute.service;

import com.smartroute.domain.entity.Product;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.repository.ProductRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.web.dto.request.AdjustQuantityRequest;
import com.smartroute.web.dto.request.CreateStockItemRequest;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.dto.response.StockItemResponse;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;

    public StockService(StockItemRepository stockItemRepository,
                        WarehouseRepository warehouseRepository,
                        ProductRepository productRepository) {
        this.stockItemRepository = stockItemRepository;
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
    }

    public PageResponse<StockItemResponse> findAll(UUID warehouseId, UUID productId, Boolean belowThreshold, Pageable pageable) {
        Page<StockItem> page;
        if (Boolean.TRUE.equals(belowThreshold)) {
            page = stockItemRepository.findBelowThreshold(pageable);
        } else if (warehouseId != null) {
            page = stockItemRepository.findByWarehouseId(warehouseId, pageable);
        } else if (productId != null) {
            page = stockItemRepository.findByProductId(productId, pageable);
        } else {
            page = stockItemRepository.findAll(pageable);
        }

        return new PageResponse<>(
            page.getContent().stream().map(this::mapToResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    @Transactional
    public StockItemResponse createOrUpdate(CreateStockItemRequest req) {
        Warehouse w = warehouseRepository.findById(req.warehouseId())
            .orElseThrow(() -> new EntityNotFoundException("Warehouse", req.warehouseId()));
        Product p = productRepository.findById(req.productId())
            .orElseThrow(() -> new EntityNotFoundException("Product", req.productId()));

        StockItem si = stockItemRepository.findByWarehouse_IdAndProduct_Id(w.getId(), p.getId())
            .orElseGet(() -> {
                StockItem newItem = new StockItem();
                newItem.setWarehouse(w);
                newItem.setProduct(p);
                return newItem;
            });

        si.setQuantity(req.quantity());
        if (req.batchExpiry() != null) {
            si.setBatchExpiry(req.batchExpiry());
        }

        return mapToResponse(stockItemRepository.save(si));
    }

    @Transactional
    public StockItemResponse adjustQuantity(UUID id, AdjustQuantityRequest req) {
        StockItem si = stockItemRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("StockItem", id));
            
        // manual adjustment sets absolute quantity
        si.setQuantity(req.quantity());
        return mapToResponse(stockItemRepository.save(si));
    }

    private StockItemResponse mapToResponse(StockItem si) {
        return new StockItemResponse(
            si.getId(), si.getWarehouse().getId(), si.getProduct().getId(),
            si.getQuantity(), si.getReservedQuantity(), si.getAvailableToPromise(),
            si.getBatchExpiry(), si.getVersion()
        );
    }
}
