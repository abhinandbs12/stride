package com.smartroute.config;

import com.smartroute.domain.entity.Customer;
import com.smartroute.domain.entity.Product;
import com.smartroute.domain.entity.StockItem;
import com.smartroute.domain.entity.Warehouse;
import com.smartroute.domain.entity.User;
import com.smartroute.domain.enums.Role;
import com.smartroute.repository.CustomerRepository;
import com.smartroute.repository.ProductRepository;
import com.smartroute.repository.StockItemRepository;
import com.smartroute.repository.WarehouseRepository;
import com.smartroute.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);

    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(WarehouseRepository warehouseRepository,
                          ProductRepository productRepository,
                          StockItemRepository stockItemRepository,
                          CustomerRepository customerRepository,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
        this.stockItemRepository = stockItemRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        seedUsers(); // Always ensure admin user exists

        if (warehouseRepository.count() == 0) {
            log.info("Database is empty. Seeding dummy data for demonstration...");
            seedData();
            log.info("Database seeding completed.");
        } else {
            log.info("Database already contains data. Seeding skipped.");
        }
    }

    private void seedUsers() {
        if (!userRepository.existsByEmail("admin@stride.com")) {
            log.info("Seeding admin@stride.com...");
            User admin = new User();
            admin.setEmail("admin@stride.com");
            admin.setPasswordHash(passwordEncoder.encode("password123"));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
        }
    }

    private void seedData() {
        seedUsers();

        // 1. Warehouses
        Warehouse whCentral = new Warehouse();
        whCentral.setName("Central Hub (Chicago)");
        whCentral.setAddress("100 Central Ave, Chicago, IL");
        whCentral.setLatitude(41.8781);
        whCentral.setLongitude(-87.6298);
        whCentral.setCostFactor(1.0);
        warehouseRepository.save(whCentral);

        Warehouse whWest = new Warehouse();
        whWest.setName("West Coast Facility (LA)");
        whWest.setAddress("200 West Blvd, Los Angeles, CA");
        whWest.setLatitude(34.0522);
        whWest.setLongitude(-118.2437);
        whWest.setCostFactor(1.2);
        warehouseRepository.save(whWest);

        Warehouse whEast = new Warehouse();
        whEast.setName("East Coast Facility (NY)");
        whEast.setAddress("300 East St, New York, NY");
        whEast.setLatitude(40.7128);
        whEast.setLongitude(-74.0060);
        whEast.setCostFactor(1.5);
        warehouseRepository.save(whEast);

        // 2. Products
        Product pLaptop = new Product();
        pLaptop.setSku("TECH-LAPTOP-X1");
        pLaptop.setName("ThinkPad X1 Carbon");
        pLaptop.setCategory("Electronics");
        pLaptop.setUnitWeightKg(1.2);
        pLaptop.setReorderThreshold(10);
        productRepository.save(pLaptop);

        Product pMonitor = new Product();
        pMonitor.setSku("TECH-MONITOR-4K");
        pMonitor.setName("Dell UltraSharp 4K");
        pMonitor.setCategory("Electronics");
        pMonitor.setUnitWeightKg(5.5);
        pMonitor.setReorderThreshold(5);
        productRepository.save(pMonitor);

        Product pKeyboard = new Product();
        pKeyboard.setSku("TECH-KEYBOARD-MECH");
        pKeyboard.setName("Logitech MX Mechanical");
        pKeyboard.setCategory("Electronics");
        pKeyboard.setUnitWeightKg(0.8);
        pKeyboard.setReorderThreshold(20);
        productRepository.save(pKeyboard);

        // 3. Stock Items
        createStock(whCentral, pLaptop, 50);
        createStock(whCentral, pMonitor, 30);
        createStock(whCentral, pKeyboard, 100);

        createStock(whWest, pLaptop, 10); // Low stock in West
        createStock(whWest, pMonitor, 0); // Out of stock in West
        createStock(whWest, pKeyboard, 50);

        createStock(whEast, pLaptop, 20);
        createStock(whEast, pMonitor, 15);
        createStock(whEast, pKeyboard, 0); // Out of stock in East

        // 4. Customers
        Customer c1 = new Customer();
        c1.setName("Alice Johnson");
        c1.setEmail("alice@example.com");
        c1.setPhone("555-0101");
        c1.setAddress("123 Maple St, Denver, CO");
        c1.setLatitude(39.7392);
        c1.setLongitude(-104.9903);
        customerRepository.save(c1);

        Customer c2 = new Customer();
        c2.setName("Bob Smith");
        c2.setEmail("bob@example.com");
        c2.setPhone("555-0202");
        c2.setAddress("456 Oak St, Austin, TX");
        c2.setLatitude(30.2672);
        c2.setLongitude(-97.7431);
        customerRepository.save(c2);
    }

    private void createStock(Warehouse w, Product p, int quantity) {
        StockItem stock = new StockItem();
        stock.setWarehouse(w);
        stock.setProduct(p);
        stock.setQuantity(quantity);
        stockItemRepository.save(stock);
    }
}
