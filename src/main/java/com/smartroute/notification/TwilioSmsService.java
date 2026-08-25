package com.smartroute.notification;

import com.smartroute.config.TwilioProperties;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class TwilioSmsService {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsService.class);

    private final TwilioProperties twilioProperties;
    private boolean isMocked = false;

    public TwilioSmsService(TwilioProperties twilioProperties) {
        this.twilioProperties = twilioProperties;
    }

    @PostConstruct
    public void init() {
        if ("mock-sid".equals(twilioProperties.accountSid()) || twilioProperties.accountSid() == null || twilioProperties.accountSid().isBlank()) {
            log.warn("Twilio credentials are mocked or missing. SMS alerts will be logged to the console instead of sent.");
            this.isMocked = true;
        } else {
            try {
                Twilio.init(twilioProperties.accountSid(), twilioProperties.authToken());
                log.info("Twilio SDK initialized successfully.");
            } catch (Exception e) {
                log.error("Failed to initialize Twilio SDK. Falling back to mock SMS.", e);
                this.isMocked = true;
            }
        }
    }

    public void sendLowStockAlert(String productName, String sku, String warehouseName, int availableToPromise) {
        String alertBody = String.format("STRIDE ALERT: Low Stock! Product '%s' (SKU: %s) has dropped to %d units at warehouse '%s'. Please reorder immediately.",
                productName, sku, availableToPromise, warehouseName);

        if (isMocked) {
            log.warn("MOCK SMS to {}: {}", twilioProperties.adminPhone(), alertBody);
            return;
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber(twilioProperties.adminPhone()),
                    new PhoneNumber(twilioProperties.phoneNumber()),
                    alertBody
            ).create();
            log.info("Sent Twilio SMS alert. SID: {}", message.getSid());
        } catch (Exception e) {
            log.error("Failed to send Twilio SMS alert", e);
        }
    }
}
