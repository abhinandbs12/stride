# STRIDE 
**Supply chain Tracking, Routing, Inventory & Distribution Engine**

STRIDE is a high-performance backend engine designed to manage warehouse inventories, orchestrate complex order fulfillment, and route orders to optimal warehouses based on distance, cost, and stock availability. 

It is built as the core backend for a Final Year Project (Presidency University, Department of Computer Science and Engineering) by Abhinand Baiju Smitha.

## 🚀 Features

- **Pure Function Routing Engine**: Implements a Bitmask Dynamic Programming (DP) consolidation algorithm to optimally split and fulfill orders from multiple warehouses. Minimizes distance and cost while maximizing fulfillment.
- **Robust State Machine**: Manages the lifecycle of orders (`CREATED` → `ALLOCATED` → `CONFIRMED` → `PICKED` → `SHIPPED` → `DELIVERED`).
- **Resilient Concurrency**: Implements strict Optimistic Locking (`@Version`) with `@Retryable` whole-use-case retries to handle high-contention warehouse stock updates without deadlocks.
- **Role-Based Security**: JWT stateless authentication with three distinct roles (`ADMIN`, `WH_MANAGER`, `SUPPLIER`) and granular SpEL-based access control.
- **Asynchronous Webhooks**: Fires HMAC SHA-256 signed webhooks to an external `n8n` automation server strictly `AFTER_COMMIT` to guarantee data consistency.
- **Automated Alerts**: Runs daily CRON jobs to evaluate stock thresholds and fire Twilio SMS alerts to warehouse managers for reordering.

## 🛠 Tech Stack

- **Language**: Java 17
- **Framework**: Spring Boot 3 (Web, Data JPA, Security, Validation, Retry)
- **Database**: PostgreSQL 15 (via Docker)
- **Migrations**: Flyway
- **API Documentation**: OpenAPI / Swagger (`springdoc-openapi`)
- **Containerization**: Docker & Docker Compose
- **Integrations**: Twilio (SMS), n8n (Webhooks & Workflow Automation)

## 📦 Architecture Overview

STRIDE enforces strict architectural boundaries:
- **`com.smartroute.routing`**: A pure Java package containing the routing logic. **Zero** Spring or JPA dependencies exist here, allowing for blisteringly fast unit tests.
- **`com.smartroute.domain.state`**: State pattern implementation mapping to the `OrderStatus` enum.
- **`com.smartroute.service`**: Transaction boundaries. `OrderService` handles retries, while `StockAllocationExecutor` handles the specific persistence of order allocations with strict lock-ordering.

## ⚙️ How to Run Locally

### Prerequisites
- Docker & Docker Compose
- Java 17 (if running outside of Docker)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhinandbs12/stride.git
   cd stride
   ```

2. **Configure Environment Variables**
   Copy the example environment file and fill in your secrets (like Twilio credentials and JWT secret):
   ```bash
   cp .env.example .env
   ```

3. **Run with Docker Compose**
   The provided `docker-compose.yml` will spin up PostgreSQL, run Flyway migrations, and start the Spring Boot application.
   ```bash
   docker-compose up --build
   ```

4. **Access the API Documentation**
   Once running, you can interact with the API via the Swagger UI:
   - `http://localhost:8080/swagger-ui.html`

## 🧩 Database Schema
The database schema is strictly managed by Flyway. Key tables include:
- `users`: Stores user credentials and roles.
- `warehouse` & `product`: Core master data.
- `stock_item`: The critical table tracking inventory with `version` for optimistic locking.
- `orders`, `order_line`, `order_allocation`: Tracks the customer request and the algorithmic routing decisions.

*Note: JPA `ddl-auto` is set to `validate` to ensure Hibernate never modifies the schema.*
