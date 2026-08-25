package com.smartroute.service;

import com.smartroute.domain.entity.StockItem;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.web.dto.request.CreateStockItemRequest;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CsvImportExportService {

    private final StockItemRepository stockItemRepository;
    private final StockService stockService;

    public CsvImportExportService(StockItemRepository stockItemRepository, StockService stockService) {
        this.stockItemRepository = stockItemRepository;
        this.stockService = stockService;
    }

    public int importCsv(InputStream inputStream) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
        String headerLine = reader.readLine(); // skip header
        if (headerLine == null) throw new IllegalArgumentException("CSV file is empty");

        int imported = 0;
        String line;
        while ((line = reader.readLine()) != null) {
            String[] parts = line.split(",");
            if (parts.length < 3) continue;

            UUID warehouseId = UUID.fromString(parts[0].trim());
            UUID productId = UUID.fromString(parts[1].trim());
            int quantity = Integer.parseInt(parts[2].trim());
            LocalDate batchExpiry = parts.length > 3 && !parts[3].trim().isEmpty()
                    ? LocalDate.parse(parts[3].trim()) : null;

            stockService.createOrUpdate(new CreateStockItemRequest(warehouseId, productId, quantity, batchExpiry));
            imported++;
        }
        return imported;
    }

    public String exportCsv() {
        List<StockItem> items = stockItemRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("warehouseId,productId,quantity,reservedQuantity,availableToPromise,batchExpiry\n");
        for (StockItem item : items) {
            sb.append(item.getWarehouse().getId()).append(",");
            sb.append(item.getProduct().getId()).append(",");
            sb.append(item.getQuantity()).append(",");
            sb.append(item.getReservedQuantity()).append(",");
            sb.append(item.getAvailableToPromise()).append(",");
            sb.append(item.getBatchExpiry() != null ? item.getBatchExpiry() : "").append("\n");
        }
        return sb.toString();
    }
}
