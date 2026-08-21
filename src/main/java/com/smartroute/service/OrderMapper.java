package com.smartroute.service;

import com.smartroute.domain.entity.Order;
import com.smartroute.web.dto.response.OrderAllocationResponse;
import com.smartroute.web.dto.response.OrderLineResponse;
import com.smartroute.web.dto.response.OrderResponse;

public final class OrderMapper {

    private OrderMapper() {}

    public static OrderResponse toResponse(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getCustomer().getId(),
            order.getStatus().name(),
            order.getOrderLines().stream()
                .map(line -> new OrderLineResponse(
                    line.getId(),
                    line.getProduct().getId(),
                    line.getQuantityRequested(),
                    line.getAllocations().stream()
                        .map(a -> new OrderAllocationResponse(
                            a.getId(),
                            a.getWarehouse().getId(),
                            a.getQuantityAllocated(),
                            a.getScoreBreakdown(),
                            a.getStatus().name()
                        )).toList()
                )).toList(),
            order.getCreatedAt(),
            order.getUpdatedAt()
        );
    }
}
