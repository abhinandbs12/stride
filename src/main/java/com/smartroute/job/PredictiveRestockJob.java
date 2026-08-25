package com.smartroute.job;

import com.smartroute.domain.entity.Product;
import com.smartroute.repository.OrderRepository;
import com.smartroute.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class PredictiveRestockJob {

    private static final Logger log = LoggerFactory.getLogger(PredictiveRestockJob.class);

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public PredictiveRestockJob(ProductRepository productRepository, OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Runs every night at 2 AM to recalculate the daily sales velocity for all products.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void calculateDailyVelocity() {
        log.info("Starting nightly predictive restocking velocity calculation...");
        List<Product> products = productRepository.findAll();

        for (Product product : products) {
            // Simplified calculation: total quantity ordered in last 7 days / 7
            // For now, we mock a complex query and just assign a slightly randomized velocity based on its threshold.
            double newVelocity = Math.max(0.5, (Math.random() * product.getReorderThreshold()) / 2.0);
            product.setDailySalesVelocity(newVelocity);
            productRepository.save(product);
            log.debug("Updated Product {} velocity to {}", product.getSku(), newVelocity);
        }

        log.info("Finished velocity calculation for {} products.", products.size());
    }
}
