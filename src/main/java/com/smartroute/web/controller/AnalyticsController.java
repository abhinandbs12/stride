package com.smartroute.web.controller;

import com.smartroute.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/order-volume")
    public List<Map<String, Object>> getOrderVolume() {
        return analyticsService.getOrderVolume();
    }

    @GetMapping("/stock-levels")
    public List<Map<String, Object>> getStockLevels() {
        return analyticsService.getStockLevels();
    }

    @GetMapping("/routing-stats")
    public Map<String, Object> getRoutingStats() {
        return analyticsService.getRoutingStats();
    }

    @GetMapping("/esg-sustainability")
    public Map<String, Object> getEsgSustainability() {
        return analyticsService.getEsgSustainability();
    }
}
