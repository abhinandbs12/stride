package com.smartroute.job;

import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.User;
import com.smartroute.domain.enums.Role;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.UserRepository;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Runs daily to alert warehouse managers of low stock (Spec §18).
 */
@Component
public class ReorderAlertJob {

    private static final Logger log = LoggerFactory.getLogger(ReorderAlertJob.class);

    private final StockItemRepository stockItemRepository;
    private final UserRepository userRepository;
    private final String fromNumber;

    public ReorderAlertJob(StockItemRepository stockItemRepository,
                           UserRepository userRepository,
                           @Value("${twilio.from-number:${twilio.phone-number:+15555555555}}") String fromNumber) {
        this.stockItemRepository = stockItemRepository;
        this.userRepository = userRepository;
        this.fromNumber = fromNumber;
    }

    @Scheduled(cron = "0 0 8 * * ?") // Every day at 8 AM
    public void checkAndAlert() {
        log.info("Starting ReorderAlertJob");

        List<StockItem> lowStockItems = stockItemRepository.findBelowThreshold();
        if (lowStockItems.isEmpty()) {
            log.info("No items below reorder threshold.");
            return;
        }

        // Group by warehouse manager
        List<User> managers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.WH_MANAGER && u.getPhone() != null && !u.getPhone().isBlank())
                .toList();

        for (User manager : managers) {
            List<StockItem> managerAlerts = lowStockItems.stream()
                .filter(si -> manager.getAssignedWarehouses().contains(si.getWarehouse()))
                .toList();

            if (!managerAlerts.isEmpty()) {
                sendSmsAlert(manager, managerAlerts);
            }
        }
    }

    private void sendSmsAlert(User manager, List<StockItem> alerts) {
        if (fromNumber == null || fromNumber.isBlank()) {
            log.warn("Twilio from-number not configured, skipping SMS to {}", manager.getEmail());
            return;
        }

        String alertText = alerts.stream()
            .map(si -> String.format("%s (qty: %d, thresh: %d)", 
                si.getProduct().getSku(), si.getQuantity(), si.getProduct().getReorderThreshold()))
            .collect(Collectors.joining("\n"));

        String body = String.format("STRIDE ALERT: %d items below threshold in your warehouses:\n%s", 
            alerts.size(), alertText);

        try {
            Message.creator(
                new PhoneNumber(manager.getPhone()),
                new PhoneNumber(fromNumber),
                body
            ).create();
            log.info("Sent reorder alert SMS to {}", manager.getEmail());
        } catch (Exception e) {
            log.error("Failed to send reorder alert SMS to {}", manager.getEmail(), e);
        }
    }
}
