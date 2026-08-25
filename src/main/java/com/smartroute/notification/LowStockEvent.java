package com.smartroute.notification;

import org.springframework.context.ApplicationEvent;

public class LowStockEvent extends ApplicationEvent {

    private final String productName;
    private final String sku;
    private final String warehouseName;
    private final int availableToPromise;

    public LowStockEvent(Object source, String productName, String sku, String warehouseName, int availableToPromise) {
        super(source);
        this.productName = productName;
        this.sku = sku;
        this.warehouseName = warehouseName;
        this.availableToPromise = availableToPromise;
    }

    public String getProductName() {
        return productName;
    }

    public String getSku() {
        return sku;
    }

    public String getWarehouseName() {
        return warehouseName;
    }

    public int getAvailableToPromise() {
        return availableToPromise;
    }
}
