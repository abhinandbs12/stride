package com.smartroute.notification;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class LowStockEventListener {

    private final TwilioSmsService twilioSmsService;

    public LowStockEventListener(TwilioSmsService twilioSmsService) {
        this.twilioSmsService = twilioSmsService;
    }

    @Async
    @EventListener
    public void handleLowStockEvent(LowStockEvent event) {
        twilioSmsService.sendLowStockAlert(
                event.getProductName(),
                event.getSku(),
                event.getWarehouseName(),
                event.getAvailableToPromise()
        );
    }
}
