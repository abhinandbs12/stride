package com.smartroute.web.controller;

import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.service.OrderService;
import com.smartroute.service.OrderStateService;
import com.smartroute.web.dto.request.OrderRequest;
import com.smartroute.web.dto.response.OrderResponse;
import com.smartroute.web.dto.response.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderStateService orderStateService;

    public OrderController(OrderService orderService, OrderStateService orderStateService) {
        this.orderService = orderService;
        this.orderStateService = orderStateService;
    }

    @GetMapping
    public PageResponse<OrderResponse> getAll(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) UUID customerId,
            Pageable pageable) {
        return orderService.findAll(status, customerId, pageable);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable UUID id) {
        return orderService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@Valid @RequestBody OrderRequest req) {
        return orderService.placeOrder(req);
    }

    @PostMapping("/{id}/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void confirmOrder(@PathVariable UUID id) {
        orderStateService.confirmOrder(id);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void cancelOrder(@PathVariable UUID id) {
        orderStateService.cancelOrder(id);
    }

    // --- Warehouse Manager Operations ---

    @PostMapping("/{id}/allocations/{allocationId}/pick")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN') or (hasRole('WH_MANAGER') and @warehouseGuard.canAccessAllocation(#allocationId, authentication))")
    public void pickAllocation(@PathVariable UUID id, @PathVariable UUID allocationId) {
        orderStateService.pickAllocation(id, allocationId);
    }

    @PostMapping("/{id}/allocations/{allocationId}/ship")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN') or (hasRole('WH_MANAGER') and @warehouseGuard.canAccessAllocation(#allocationId, authentication))")
    public void shipAllocation(@PathVariable UUID id, @PathVariable UUID allocationId) {
        orderStateService.shipAllocation(id, allocationId);
    }
}
