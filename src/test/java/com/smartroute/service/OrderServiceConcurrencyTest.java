package com.smartroute.service;

import com.smartroute.domain.entity.Customer;
import com.smartroute.domain.entity.Product;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.repository.CustomerRepository;
import com.smartroute.repository.ProductRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.web.dto.request.OrderLineRequest;
import com.smartroute.web.dto.request.OrderRequest;
import com.smartroute.web.exception.StockConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class OrderServiceConcurrencyTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private OrderService orderService;

    @Autowired
    private StockItemRepository stockItemRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private Customer customerA;
    private Product product;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        stockItemRepository.deleteAll();
        warehouseRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();

        warehouse = new Warehouse();
        warehouse.setName("Test Warehouse Concurrency");
        warehouse.setLatitude(10.0);
        warehouse.setLongitude(10.0);
        warehouse.setCostFactor(1.0);
        warehouse = warehouseRepository.save(warehouse);

        product = new Product();
        product.setSku("TEST-SKU-CONCURRENCY");
        product.setName("Test Product");
        product.setReorderThreshold(2);
        product = productRepository.save(product);

        StockItem stockItem = new StockItem();
        stockItem.setWarehouse(warehouse);
        stockItem.setProduct(product);
        stockItem.setQuantity(10);
        stockItem.setReservedQuantity(0);
        stockItemRepository.save(stockItem);

        customerA = new Customer();
        customerA.setName("Customer A");
        customerA.setLatitude(10.1);
        customerA.setLongitude(10.1);
        customerA = customerRepository.save(customerA);
    }

    @Test
    void shouldPreventOversellingOnConcurrentOrders() throws InterruptedException {
        int threadCount = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        OrderRequest requestA = new OrderRequest(customerA.getId(), List.of(new OrderLineRequest(product.getId(), 8)));

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.placeOrder(requestA);
                    successCount.incrementAndGet();
                } catch (StockConflictException e) {
                    conflictCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected error
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(); // wait for all threads to be ready
        startLatch.countDown(); // release the hounds
        doneLatch.await(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(threadCount - 1);

        StockItem finalStock = stockItemRepository.findAll().get(0);
        assertThat(finalStock.getQuantity()).isEqualTo(10);
        assertThat(finalStock.getReservedQuantity()).isEqualTo(8);
        
        executor.shutdown();
    }
}
