package com.smartroute.service;

import com.smartroute.domain.entity.Order;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.repository.OrderRepository;
import com.smartroute.repository.StockItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final StockItemRepository stockItemRepository;

    public AnalyticsService(OrderRepository orderRepository, StockItemRepository stockItemRepository) {
        this.orderRepository = orderRepository;
        this.stockItemRepository = stockItemRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOrderVolume() {
        List<Order> allOrders = orderRepository.findAll();
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);

        // Group orders by date
        Map<String, Long> countByDay = allOrders.stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(thirtyDaysAgo))
                .collect(Collectors.groupingBy(
                        o -> o.getCreatedAt().toString().substring(0, 10), // yyyy-MM-dd
                        TreeMap::new,
                        Collectors.counting()
                ));

        List<Map<String, Object>> result = new ArrayList<>();
        countByDay.forEach((date, count) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date);
            entry.put("orders", count);
            result.add(entry);
        });
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStockLevels() {
        List<StockItem> items = stockItemRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (StockItem item : items) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("warehouse", item.getWarehouse().getName());
            entry.put("product", item.getProduct().getName());
            entry.put("quantity", item.getQuantity());
            entry.put("reserved", item.getReservedQuantity());
            entry.put("available", item.getAvailableToPromise());
            result.add(entry);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRoutingStats() {
        List<Order> allOrders = orderRepository.findAll();
        long total = allOrders.size();
        long routedFull = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.ROUTED_FULL).count();
        long routedPartial = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.ROUTED_PARTIAL).count();
        long created = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.CREATED).count();
        long shipped = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.SHIPPED).count();
        long cancelled = allOrders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("routedFull", routedFull);
        stats.put("routedPartial", routedPartial);
        stats.put("created", created);
        stats.put("shipped", shipped);
        stats.put("cancelled", cancelled);
        return stats;
    }
}
