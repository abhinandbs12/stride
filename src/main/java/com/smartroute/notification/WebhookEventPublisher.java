package com.smartroute.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartroute.domain.entity.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Fires webhooks to n8n AFTER transaction commit (Arch Ref §11.4).
 */
@Component
public class WebhookEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(WebhookEventPublisher.class);

    private final String webhookUrl;
    private final String signingSecret;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WebhookEventPublisher(
            @Value("${webhook.n8n-base-url}") String webhookUrl,
            @Value("${webhook.signing-secret}") String signingSecret,
            ObjectMapper objectMapper) {
        this.webhookUrl = webhookUrl;
        this.signingSecret = signingSecret;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().build();
    }

    public void publishOrderAllocated(Order order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "ORDER_ALLOCATED");
        payload.put("orderId", order.getId().toString());
        payload.put("customerId", order.getCustomer().getId().toString());
        payload.put("status", order.getStatus().name());
        
        publishAfterCommit(payload);
    }

    public void publishStockBackordered(Order order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "STOCK_BACKORDERED");
        payload.put("orderId", order.getId().toString());
        
        publishAfterCommit(payload);
    }

    public void publishOrderShipped(Order order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "ORDER_SHIPPED");
        payload.put("orderId", order.getId().toString());
        
        publishAfterCommit(payload);
    }

    public void publishOrderCancelled(Order order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "ORDER_CANCELLED");
        payload.put("orderId", order.getId().toString());
        
        publishAfterCommit(payload);
    }

    private void publishAfterCommit(Map<String, Object> payload) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    String json = objectMapper.writeValueAsString(payload);
                    String signature = generateSignature(json, signingSecret);

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(webhookUrl))
                            .header("Content-Type", "application/json")
                            .header("X-Hub-Signature", "sha256=" + signature)
                            .POST(HttpRequest.BodyPublishers.ofString(json))
                            .build();

                    httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                            .thenAccept(response -> {
                                if (response.statusCode() >= 400) {
                                    log.warn("Webhook failed with status: {}", response.statusCode());
                                }
                            })
                            .exceptionally(ex -> {
                                log.error("Failed to send webhook", ex);
                                return null;
                            });
                            
                } catch (Exception e) {
                    log.error("Error preparing webhook payload", e);
                }
            }
        });
    }

    static String generateSignature(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(digest);
    }
}
