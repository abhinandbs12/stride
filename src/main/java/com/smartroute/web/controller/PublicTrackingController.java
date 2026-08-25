package com.smartroute.web.controller;

import com.smartroute.domain.entity.Order;
import com.smartroute.domain.entity.OrderAllocation;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.domain.enums.AllocationStatus;
import com.smartroute.domain.enums.OrderStatus;
import com.smartroute.repository.OrderRepository;
import com.smartroute.web.dto.response.PublicTrackingResponse;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/track")
public class PublicTrackingController {

    private final OrderRepository orderRepository;
    private final com.smartroute.service.ShippingCarrierService carrierService;

    public PublicTrackingController(OrderRepository orderRepository,
                                    com.smartroute.service.ShippingCarrierService carrierService) {
        this.orderRepository = orderRepository;
        this.carrierService = carrierService;
    }

    @GetMapping("/{trackingRef}")
    public PublicTrackingResponse trackOrder(@PathVariable String trackingRef) {
        Order order = null;

        // Try parsing UUID directly
        try {
            UUID orderId = UUID.fromString(trackingRef.trim());
            order = orderRepository.findById(orderId).orElse(null);
        } catch (IllegalArgumentException ignored) {
            // Not a direct UUID, try finding by prefix
        }

        if (order == null) {
            // Search all orders for prefix match or ID match
            List<Order> orders = orderRepository.findAll();
            String cleanRef = trackingRef.replace("STR-", "").trim().toLowerCase();
            for (Order o : orders) {
                if (o.getId().toString().toLowerCase().startsWith(cleanRef) ||
                    o.getId().toString().toLowerCase().contains(cleanRef)) {
                    order = o;
                    break;
                }
            }
        }

        if (order == null) {
            throw new EntityNotFoundException("Tracked Order", trackingRef);
        }

        // Determine carrier and origin warehouse
        String carrier = "STRIDE Ground Express";
        Warehouse originWh = null;
        boolean hasShippedAllocation = false;
        boolean hasPickedAllocation = false;

        if (!order.getOrderLines().isEmpty() && !order.getOrderLines().get(0).getAllocations().isEmpty()) {
            OrderAllocation alloc = order.getOrderLines().get(0).getAllocations().get(0);
            originWh = alloc.getWarehouse();
            if (alloc.getScoreBreakdown() != null) {
                if (alloc.getScoreBreakdown().contains("USPS")) carrier = "USPS Priority Mail 2-Day";
                else if (alloc.getScoreBreakdown().contains("FedEx")) carrier = "FedEx Express Priority";
                else if (alloc.getScoreBreakdown().contains("UPS")) carrier = "UPS Ground Tracked";
            }
            hasPickedAllocation = alloc.getStatus() == AllocationStatus.PICKED || alloc.getStatus() == AllocationStatus.SHIPPED;
            hasShippedAllocation = alloc.getStatus() == AllocationStatus.SHIPPED;
        }

        String trackingNumber = "STR-" + carrier.substring(0, 3).toUpperCase() + "-" + order.getId().toString().substring(0, 8).toUpperCase();

        // Build Milestones Timeline
        List<PublicTrackingResponse.TrackingMilestone> milestones = new ArrayList<>();
        
        // 1. Created
        milestones.add(new PublicTrackingResponse.TrackingMilestone(
            "Order Verified",
            "Payment verified and order accepted into STRIDE network.",
            true,
            order.getCreatedAt()
        ));

        // 2. Routed
        boolean routed = order.getStatus() != OrderStatus.CREATED;
        milestones.add(new PublicTrackingResponse.TrackingMilestone(
            "Routing Optimized",
            originWh != null ? "Intelligently allocated to " + originWh.getName() : "Optimal warehouse routing computed.",
            routed,
            routed ? order.getCreatedAt().plusSeconds(30) : null
        ));

        // 3. Picked & Packed
        boolean picked = hasPickedAllocation || order.getStatus() == OrderStatus.PICKED || order.getStatus() == OrderStatus.SHIPPED;
        milestones.add(new PublicTrackingResponse.TrackingMilestone(
            "Picked & Packed",
            "Items verified via barcode scan and thermal shipping label applied.",
            picked,
            picked ? order.getUpdatedAt() : null
        ));

        // 4. In Transit
        boolean inTransit = hasShippedAllocation || order.getStatus() == OrderStatus.SHIPPED;
        milestones.add(new PublicTrackingResponse.TrackingMilestone(
            "In Transit (" + carrier + ")",
            inTransit ? "Dispatched from origin hub. On carrier vehicle for delivery." : "Awaiting carrier pickup.",
            inTransit,
            inTransit ? order.getUpdatedAt().plusSeconds(60) : null
        ));

        // 5. Delivered
        boolean delivered = order.getStatus() == OrderStatus.DELIVERED;
        milestones.add(new PublicTrackingResponse.TrackingMilestone(
            "Delivered",
            delivered ? "Delivered to recipient address." : "Estimated standard delivery 1-3 business days.",
            delivered,
            delivered ? order.getUpdatedAt().plusSeconds(3600) : null
        ));

        String originName = originWh != null ? originWh.getName() : "Central Hub";
        String originAddr = originWh != null ? originWh.getAddress() : "1000 Westgate Dr, Chicago, IL 60607";
        double originLat = originWh != null ? originWh.getLatitude() : 41.8781;
        double originLng = originWh != null ? originWh.getLongitude() : -87.6298;

        String customerName = order.getCustomer() != null ? order.getCustomer().getName() : "Customer";
        String destAddr = order.getCustomer() != null ? order.getCustomer().getAddress() : "Portland, OR";
        double destLat = order.getCustomer() != null ? order.getCustomer().getLatitude() : 45.5152;
        double destLng = order.getCustomer() != null ? order.getCustomer().getLongitude() : -122.6784;

        int itemCount = order.getOrderLines().stream().mapToInt(l -> l.getQuantityRequested()).sum();
        double weightKg = Math.max(1.0, itemCount * 2.0);
        double estCarbon = Math.round(carrierService.estimateCarbon(550.0, weightKg, carrier) * 100.0) / 100.0;
        String transportMode = carrier.contains("USPS") ? "Regional Low-Emission Ground" : carrier.contains("FedEx") ? "Priority Air Express" : "Commercial Hybrid Fleet";

        return new PublicTrackingResponse(
            order.getId(),
            trackingNumber,
            order.getStatus().name(),
            carrier,
            transportMode,
            estCarbon,
            true, // Certified Carbon Offset
            originName,
            originAddr,
            originLat,
            originLng,
            customerName,
            destAddr,
            destLat,
            destLng,
            itemCount,
            order.getCreatedAt(),
            order.getUpdatedAt(),
            milestones
        );
    }
}
