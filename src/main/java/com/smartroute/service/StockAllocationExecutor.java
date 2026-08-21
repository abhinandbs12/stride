package com.smartroute.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartroute.domain.entity.Customer;
import com.smartroute.domain.entity.Order;
import com.smartroute.domain.entity.OrderAllocation;
import com.smartroute.domain.entity.OrderLine;
import com.smartroute.domain.entity.Product;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.repository.OrderRepository;
import com.smartroute.repository.ProductRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.routing.model.AllocationEntry;
import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.web.dto.request.OrderLineRequest;
import com.smartroute.web.dto.request.OrderRequest;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Persists the output of the routing algorithm.
 * Extracted from OrderService to keep transaction boundaries clear.
 * (Arch Ref §3.2, §11.1)
 */
@Service
public class StockAllocationExecutor {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockItemRepository stockItemRepository;
    private final ObjectMapper objectMapper;

    public StockAllocationExecutor(OrderRepository orderRepository,
                                   ProductRepository productRepository,
                                   WarehouseRepository warehouseRepository,
                                   StockItemRepository stockItemRepository,
                                   ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.warehouseRepository = warehouseRepository;
        this.stockItemRepository = stockItemRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Executes within the transaction started by OrderService.placeOrder.
     * MUST NOT be annotated with @Retryable itself.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Order persistOrderWithAllocations(Customer customer, OrderRequest request, AllocationPlan plan) {
        
        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.CREATED);
        
        Map<UUID, OrderLine> linesByProduct = new HashMap<>();
        
        for (OrderLineRequest lr : request.lines()) {
            Product p = productRepository.findById(lr.productId())
                .orElseThrow(() -> new EntityNotFoundException("Product", lr.productId()));
                
            OrderLine line = new OrderLine();
            line.setProduct(p);
            line.setQuantityRequested(lr.quantity());
            order.addOrderLine(line);
            linesByProduct.put(p.getId(), line);
        }

        // Sort entries by warehouseId and productId to PREVENT DEADLOCKS
        // when acquiring row locks (Arch Ref §11.1 guardrail).
        List<AllocationEntry> sortedEntries = plan.entries().stream()
            .sorted(Comparator.comparing(AllocationEntry::warehouseId)
                              .thenComparing(AllocationEntry::productId))
            .toList();

        for (AllocationEntry entry : sortedEntries) {
            StockItem stockItem = stockItemRepository.findByWarehouseIdAndProductId(entry.warehouseId(), entry.productId())
                .orElseThrow(() -> new EntityNotFoundException("StockItem", entry.productId())); // should never happen if plan is valid

            // GUARDED MUTATION (Arch Ref §13)
            stockItem.reserve(entry.quantity());
            stockItemRepository.save(stockItem); // flush will trigger version check

            Warehouse w = warehouseRepository.getReferenceById(entry.warehouseId());
            OrderLine line = linesByProduct.get(entry.productId());
            
            OrderAllocation allocation = new OrderAllocation();
            allocation.setWarehouse(w);
            allocation.setQuantityAllocated(entry.quantity());
            try {
                allocation.setScoreBreakdown(objectMapper.writeValueAsString(entry.breakdown()));
            } catch (JsonProcessingException e) {
                allocation.setScoreBreakdown("{}");
            }
            line.addAllocation(allocation);
        }

        return orderRepository.save(order);
    }
}
