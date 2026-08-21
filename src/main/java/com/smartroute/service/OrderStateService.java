package com.smartroute.service;

import com.smartroute.domain.entity.Order;
import com.smartroute.domain.entity.OrderAllocation;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.enums.AllocationStatus;
import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.domain.state.OrderState;
import com.smartroute.domain.state.OrderStateFactory;
import com.smartroute.notification.WebhookEventPublisher;
import com.smartroute.repository.OrderAllocationRepository;
import com.smartroute.repository.OrderRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.web.exception.ApiException;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Enforces order lifecycle transitions. (Arch Ref §11.2)
 * All order status changes MUST happen here.
 */
@Service
public class OrderStateService {

    private final OrderRepository orderRepository;
    private final OrderAllocationRepository allocationRepository;
    private final StockItemRepository stockItemRepository;
    private final WebhookEventPublisher webhookPublisher;

    public OrderStateService(OrderRepository orderRepository,
                             OrderAllocationRepository allocationRepository,
                             StockItemRepository stockItemRepository,
                             WebhookEventPublisher webhookPublisher) {
        this.orderRepository = orderRepository;
        this.allocationRepository = allocationRepository;
        this.stockItemRepository = stockItemRepository;
        this.webhookPublisher = webhookPublisher;
    }

    @Transactional
    public void transition(Order order, OrderEvent event) {
        OrderState currentState = OrderStateFactory.fromStatus(order.getStatus());
        OrderState nextState = currentState.onEvent(event);
        order.setStatus(nextState.status());
        orderRepository.save(order);
    }

    @Transactional
    public void confirmOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order", orderId));
        transition(order, OrderEvent.CONFIRM);
    }

    @Transactional
    public void pickAllocation(UUID orderId, UUID allocationId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order", orderId));
            
        OrderAllocation allocation = allocationRepository.findById(allocationId)
            .orElseThrow(() -> new EntityNotFoundException("Allocation", allocationId));

        if (!allocation.getOrderLine().getOrder().getId().equals(orderId)) {
            throw new ApiException("Allocation does not belong to order", HttpStatus.BAD_REQUEST, "INVALID_RELATION") {};
        }

        if (allocation.getStatus() != AllocationStatus.ALLOCATED) {
            throw new ApiException("Allocation is not in ALLOCATED state", HttpStatus.CONFLICT, "ILLEGAL_STATE") {};
        }

        allocation.setStatus(AllocationStatus.PICKED);
        allocationRepository.save(allocation);

        // Aggregation check (Arch Ref §4.4)
        boolean allPicked = order.getOrderLines().stream()
            .flatMap(line -> line.getAllocations().stream())
            .allMatch(a -> a.getStatus() == AllocationStatus.PICKED || a.getStatus() == AllocationStatus.SHIPPED);

        if (allPicked && order.getStatus() == OrderStatus.CONFIRMED) {
            transition(order, OrderEvent.PICK);
        }
    }

    @Transactional
    public void shipAllocation(UUID orderId, UUID allocationId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order", orderId));
            
        OrderAllocation allocation = allocationRepository.findById(allocationId)
            .orElseThrow(() -> new EntityNotFoundException("Allocation", allocationId));

        if (!allocation.getOrderLine().getOrder().getId().equals(orderId)) {
            throw new ApiException("Allocation does not belong to order", HttpStatus.BAD_REQUEST, "INVALID_RELATION") {};
        }

        if (allocation.getStatus() != AllocationStatus.PICKED) {
            throw new ApiException("Allocation is not in PICKED state", HttpStatus.CONFLICT, "ILLEGAL_STATE") {};
        }

        // Deduct physical stock (Spec §12.4)
        StockItem stockItem = stockItemRepository.findByWarehouseIdAndProductId(
                allocation.getWarehouse().getId(), allocation.getOrderLine().getProduct().getId())
            .orElseThrow(() -> new EntityNotFoundException("StockItem", "warehouse+product"));
            
        stockItem.deduct(allocation.getQuantityAllocated());
        stockItemRepository.save(stockItem);

        allocation.setStatus(AllocationStatus.SHIPPED);
        allocationRepository.save(allocation);

        // Aggregation check
        boolean allShipped = order.getOrderLines().stream()
            .flatMap(line -> line.getAllocations().stream())
            .allMatch(a -> a.getStatus() == AllocationStatus.SHIPPED);

        if (allShipped && (order.getStatus() == OrderStatus.PICKED || order.getStatus() == OrderStatus.CONFIRMED)) {
            transition(order, OrderEvent.SHIP);
            webhookPublisher.publishOrderShipped(order);
        }
    }

    @Transactional
    public void cancelOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new EntityNotFoundException("Order", orderId));

        if (order.getStatus() == OrderStatus.SHIPPED || order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) {
             throw new ApiException("Cannot cancel order in state " + order.getStatus(), HttpStatus.CONFLICT, "ILLEGAL_STATE") {};
        }

        // Release reserved stock for all allocations
        order.getOrderLines().forEach(line -> {
            line.getAllocations().forEach(allocation -> {
                if (allocation.getStatus() != AllocationStatus.SHIPPED) {
                    StockItem stockItem = stockItemRepository.findByWarehouseIdAndProductId(
                            allocation.getWarehouse().getId(), line.getProduct().getId())
                        .orElseThrow(() -> new EntityNotFoundException("StockItem", "warehouse+product"));
                        
                    stockItem.release(allocation.getQuantityAllocated());
                    stockItemRepository.save(stockItem);
                }
            });
        });

        transition(order, OrderEvent.CANCEL);
        webhookPublisher.publishOrderCancelled(order);
    }
}
