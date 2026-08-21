package com.smartroute.service;

import com.smartroute.domain.entity.Customer;
import com.smartroute.domain.entity.Order;
import com.smartroute.domain.enums.OrderEvent;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.notification.WebhookEventPublisher;
import com.smartroute.repository.CustomerRepository;
import com.smartroute.repository.OrderRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.routing.RoutingStrategy;
import com.smartroute.routing.model.AllocationPlan;
import com.smartroute.routing.model.LineRequest;
import com.smartroute.routing.model.StockSnapshot;
import com.smartroute.web.dto.request.OrderRequest;
import com.smartroute.web.dto.response.OrderResponse;
import com.smartroute.web.dto.response.PageResponse;
import com.smartroute.web.exception.EntityNotFoundException;
import com.smartroute.web.exception.StockConflictException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Orchestrates order placement (Spec §12.3).
 * Annotated with @Retryable to re-run the ENTIRE use case (fetch + route + persist) on contention.
 */
@Service
public class OrderService {

    private final CustomerRepository customerRepository;
    private final StockItemRepository stockItemRepository;
    private final RoutingStrategy routingStrategy;
    private final StockAllocationExecutor allocationExecutor;
    private final OrderStateService orderStateService;
    private final WebhookEventPublisher webhookPublisher;
    private final OrderRepository orderRepository;

    public OrderService(CustomerRepository customerRepository,
                        StockItemRepository stockItemRepository,
                        RoutingStrategy routingStrategy,
                        StockAllocationExecutor allocationExecutor,
                        OrderStateService orderStateService,
                        WebhookEventPublisher webhookPublisher,
                        OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.stockItemRepository = stockItemRepository;
        this.routingStrategy = routingStrategy;
        this.allocationExecutor = allocationExecutor;
        this.orderStateService = orderStateService;
        this.webhookPublisher = webhookPublisher;
        this.orderRepository = orderRepository;
    }

    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        // 1. Load customer
        Customer customer = customerRepository.findById(request.customerId())
            .orElseThrow(() -> new EntityNotFoundException("Customer", request.customerId()));

        // 2. Build line requests
        List<LineRequest> lines = request.lines().stream()
            .map(l -> new LineRequest(l.productId(), l.quantity()))
            .toList();

        // 3. Fetch FRESH stock snapshots (re-fetched on every retry)
        List<UUID> productIds = lines.stream().map(LineRequest::productId).toList();
        List<StockSnapshot> snapshots = stockItemRepository.findCandidateSnapshots(productIds);

        // 4. Run PURE routing algorithm
        AllocationPlan plan = routingStrategy.route(
            customer.getLatitude(), customer.getLongitude(), lines, snapshots);

        // 5. Persist order + allocations + update stock (version-checked)
        Order order = allocationExecutor.persistOrderWithAllocations(customer, request, plan);

        // 6. Determine status via state machine
        boolean hasBackorder = !plan.backorderedByProduct().isEmpty();
        OrderEvent event = hasBackorder ? OrderEvent.ROUTED_PARTIAL : OrderEvent.ROUTED_FULL;
        orderStateService.transition(order, event);

        // 7. Fire webhooks AFTER_COMMIT
        webhookPublisher.publishOrderAllocated(order);
        if (hasBackorder) {
            webhookPublisher.publishStockBackordered(order);
        }

        return OrderMapper.toResponse(order);
    }

    @Recover
    public OrderResponse recoverFromContention(
            ObjectOptimisticLockingFailureException ex, OrderRequest request) {
        throw new StockConflictException("Unable to allocate stock after repeated contention", ex);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> findAll(OrderStatus status, UUID customerId, Pageable pageable) {
        Page<Order> page;
        if (status != null) {
            page = orderRepository.findByStatus(status, pageable);
        } else if (customerId != null) {
            page = orderRepository.findByCustomerId(customerId, pageable);
        } else {
            page = orderRepository.findAll(pageable);
        }
        
        return new PageResponse<>(
            page.getContent().stream().map(OrderMapper::toResponse).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(UUID id) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Order", id));
        return OrderMapper.toResponse(order);
    }
}
