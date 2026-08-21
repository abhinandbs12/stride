# STRIDE — Architecture Reference (Full Reference)

> **Source**: STRIDE_Architecture_Reference.pdf (27 pages)
> **Purpose**: Operational companion to the Project Specification — describes exactly how each part behaves at runtime, down to method-call level.

---

## 1. Purpose of This Document

The main project specification describes **what** the system is and **why** it is designed the way it is. This document is the operational companion: it describes **exactly how each part of the system behaves at runtime**, down to the method-call level, so that implementation can proceed without guessing at wiring, transaction scope, or error paths.

Use this document while coding to answer questions like:
- "Which class calls which?"
- "What happens if this throws halfway through?"
- "Is this method inside a transaction?"
- "What exactly goes wrong if I get this ordering wrong?"

**Section 11 (Failure Mode Catalog) is a pre-flight checklist, not just background reading.**

---

## 2. The Dependency Direction Rule

### 2.1 The Rule

**Dependencies point inward (toward the domain/algorithm) and downward (toward the database). Never outward or upward.**

```
Controller → Service → RoutingStrategy (pure)
                     → StockAllocationExecutor → Repository → PostgreSQL
```

**Critical constraint:** `RoutingStrategy` / `DistanceCostStrategy` / `ConsolidationPlanner` must **never** import anything from `org.springframework.*` or `jakarta.persistence.*`. They receive plain records (`StockSnapshot`, `LineRequest`) and return plain records (`AllocationPlan`). If an import from Spring or JPA appears in these classes, the layering has been violated.

### 2.2 Why This Matters

- **Testability:** The pure-function boundary allows the routing algorithm to be tested in <100ms with no Spring context, no database, no Docker.
- **Correctness under retry:** Because the routing function has no side effects, calling it again with updated inputs on a retry is trivially safe.
- **Substitutability:** A new strategy can be swapped in by registering a different `@Bean`; nothing else changes.

---

## 3. Complete Component Inventory

### 3.1 Web Layer

| Class | Responsibility |
|-------|---------------|
| `AuthController` | Login, register, refresh token endpoints |
| `OrderController` | POST /orders, GET /orders, state-transition endpoints |
| `WarehouseController` | CRUD for warehouses (ADMIN only) |
| `ProductController` | CRUD for products (ADMIN, SUPPLIER) |
| `StockController` | Stock management (WH_MANAGER with warehouse scoping) |
| `CustomerController` | CRUD for customers |
| `GlobalExceptionHandler` | `@RestControllerAdvice` — single point for error response construction |

### 3.2 Service Layer

| Class | Responsibility | Transactional? |
|-------|---------------|----------------|
| `OrderService` | Orchestrates place-order flow: read snapshot → call routing → delegate to executor. **`@Retryable`** sits here. | `@Transactional` |
| `StockAllocationExecutor` | Persists Order, OrderLine, OrderAllocation; updates StockItem.reservedQuantity via guarded entity methods. **Sorts by StockItem.id** to avoid deadlocks. | Called within OrderService's transaction |
| `OrderStateService` | Delegates to `OrderState` implementations for transitions. Handles confirm/pick/ship/cancel. Aggregation check on SHIPPED. | `@Transactional` (for cancel — releases stock) |
| `WarehouseService` | Standard CRUD with pagination | Single-write (implicit) |
| `ProductService` | Standard CRUD with pagination | Single-write (implicit) |
| `StockService` | Stock CRUD + manual adjustment | Single-write (implicit) |
| `CustomerService` | Standard CRUD | Single-write (implicit) |
| `AuthenticationService` | Register (BCrypt hash), login (validate + issue tokens), refresh | No (read-only lookup) |

**Rule of thumb:** A method is `@Transactional` if and only if it performs more than one write that must succeed or fail together.

### 3.3 Routing Layer (pure — no Spring)

| Class | Responsibility |
|-------|---------------|
| `RoutingStrategy` | Interface: `AllocationPlan route(Customer, List<LineRequest>, List<StockSnapshot>)` |
| `DistanceCostStrategy` | Default implementation: Phase 1 (candidate filtering) + Phase 2 (greedy scoring) |
| `ConsolidationPlanner` | Phase 3: bitmask DP over candidate subsets |
| `AllocationPlanBuilder` | Incremental builder for immutable AllocationPlan |

### 3.4 Domain/State

| Class | Responsibility |
|-------|---------------|
| `OrderState` (interface) | `OrderState onEvent(OrderEvent event)` + `OrderStatus status()` |
| `CreatedState`, `AllocatedState`, `PartiallyAllocatedState`, `ConfirmedState`, `PickedState`, `ShippedState`, `DeliveredState`, `CancelledState` | Each encodes valid transitions from that state |
| `OrderStateService` | Maps current status → OrderState impl, calls `onEvent()`, persists new status |

### 3.5 Repository Layer

| Repository | Key Custom Methods |
|-----------|-------------------|
| `StockItemRepository` | `findCandidateSnapshots(List<LineRequest>)` — returns `List<StockSnapshot>` for routing; `findBelowThreshold()` — for reorder alerts; `findByWarehouseAndProduct()` |
| `OrderRepository` | Paginated with filter by status/date/customer |
| `OrderAllocationRepository` | `findWarehouseIdById(UUID allocationId)` — for warehouse guard |
| `UserRepository` | `findByEmail()`, `isAssignedToWarehouse(UUID userId, UUID warehouseId)` |

### 3.6 Cross-Cutting

| Component | Responsibility |
|-----------|---------------|
| `JwtFilter` | `OncePerRequestFilter` — validates Bearer token, populates SecurityContext |
| `JwtService` | Token creation (access + refresh), validation, claim extraction |
| `WarehouseAccessGuard` | `@Component("warehouseGuard")` — `canAccess(UUID warehouseId, Authentication)` for SpEL in `@PreAuthorize` |
| `SecurityConfig` | STATELESS sessions, CSRF disabled, `addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)`, `@EnableMethodSecurity` |
| `ReorderAlertJob` | `@Scheduled(cron = "0 0 6 * * *")` — calls ReorderAlertService |
| `TwilioSmsClient` | Wraps Twilio API call in try/catch — never throws upward |

---

## 4. Complete Request Lifecycle Walkthroughs

### 4.1 Lifecycle A: Place Order — Happy Path (Full Coverage)

```
1. Client sends POST /api/v1/orders with JWT
2. JwtFilter validates token → populates SecurityContext
3. OrderController.placeOrder() receives @Valid OrderRequest
4. OrderController delegates to OrderService.placeOrder()
5. OrderService (within @Transactional + @Retryable):
   5a. Reads customer from CustomerRepository
   5b. Reads List<StockSnapshot> from StockItemRepository.findCandidateSnapshots()
   5c. Calls routingStrategy.route(customer, lines, snapshots) → AllocationPlan (PURE, no DB)
   5d. Delegates to StockAllocationExecutor.persistOrderWithAllocations():
       - Creates Order entity (status = CREATED)
       - Creates OrderLine entities
       - For each AllocationEntry in plan (sorted by StockItem.id to prevent deadlocks):
         - Loads StockItem entity (with @Version)
         - Calls stockItem.reserve(qty) → increments reservedQuantity
         - Creates OrderAllocation entity with scoreBreakdown
       - Saves all entities (flush triggers version check)
   5e. Determines final status via OrderState:
       - All lines fully covered → ALLOCATED
       - Any backorder → PARTIALLY_ALLOCATED
   5f. Sets order status via OrderStateService
6. OrderService returns OrderResponse
7. OrderController returns 200 OK with response body
```

### 4.2 Lifecycle B: Place Order — Concurrency Conflict (Retry Path)

```
1-5c. Same as Lifecycle A
5d. StockAllocationExecutor.persistOrderWithAllocations() flushes...
    UPDATE stock_item SET reserved_quantity=?, version=version+1 WHERE id=? AND version=?
    → 0 rows affected (another transaction already bumped version)
    → Hibernate throws ObjectOptimisticLockingFailureException
    → @Transactional rolls back the ENTIRE transaction
7. Spring Retry catches the exception
8. @Retryable RE-INVOKES OrderService.placeOrder() from the top (step 5)
9. Fresh stock snapshot is read (step 5b) — now reflects the other transaction's commit
10. Routing re-runs with correct, current data (step 5c)
11. New attempt persists successfully (step 5d)
12. If all retries exhausted → @Recover → throw StockConflictException → 409 STOCK_CONFLICT
```

### 4.3 Lifecycle C: Place Order — Partial Coverage (Backorder Path)

```
1-5c. Same as Lifecycle A, but routing returns an AllocationPlan where
      backorderedByProduct is non-empty
5d. StockAllocationExecutor persists only the covered allocations
5e. OrderStateService transitions: CREATED → PARTIALLY_ALLOCATED
6. Response includes allocations[] for covered lines + backorderedQuantity for uncovered
7. This is a 200 OK — backorder is a valid business outcome, NOT an error
```

### 4.4 Lifecycle D: Order Transition — Confirm/Pick/Ship

```
1. WH_MANAGER sends POST /orders/{id}/allocations/{allocationId}/pick
2. Auth check: hasRole('WH_MANAGER') AND @warehouseGuard.canAccessAllocation(allocationId)
3. OrderStateService:
   a. Loads order and allocation
   b. Validates allocation status allows transition (ALLOCATED → PICKED)
   c. Updates allocation status
   d. Checks if ALL sibling allocations for the parent order are now at the same state
   e. If yes → advances order-level status (e.g., all PICKED → order becomes PICKED)
```

### 4.5 Lifecycle E: Order Cancellation

```
1. ADMIN sends POST /orders/{id}/cancel
2. OrderStateService:
   a. Loads order — checks current status is pre-SHIPPED (guard)
   b. For each OrderAllocation under this order:
      - Loads StockItem
      - Calls stockItem.release(allocatedQuantity) → decrements reservedQuantity
   c. Transitions order status → CANCELLED via OrderState
   d. Saves everything within @Transactional
```

### 4.6 Lifecycle F: Reorder Alert Scheduled Job

```
1. @Scheduled triggers ReorderAlertJob.checkReorderThresholds() at 6 AM daily
2. Queries StockItemRepository.findBelowThreshold()
   (stock_item JOIN product WHERE stock_item.quantity < product.reorder_threshold)
3. Groups results by warehouse
4. For each warehouse + its low-stock items:
   - Builds summary string
   - For each manager assigned to that warehouse:
     - Calls TwilioSmsClient.send() (wrapped in try/catch, never throws)
5. Job completes regardless of individual SMS failures
```

### 4.7 Lifecycle G: Login / Token Refresh

```
Login:
1. POST /auth/login → AuthController
2. AuthenticationService validates email + BCrypt password
3. JwtService creates access token (15 min) + refresh token (7 days)
4. Refresh token hash stored in DB
5. Returns both tokens

Refresh:
1. POST /auth/refresh with refresh token
2. Validates refresh token signature + checks hash against DB
3. Issues new access token
4. Optionally rotates refresh token
```

---

## 5. Transaction Boundary Map

| Method | @Transactional? | Why |
|--------|----------------|-----|
| `OrderService.placeOrder()` | **Yes** | Multi-write: Order + OrderLines + OrderAllocations + StockItem updates. Must be atomic. |
| `OrderStateService.transitionAllocation()` | **Yes** | Allocation status update + potentially order status update + stock deduction on ship |
| `OrderStateService.cancel()` | **Yes** | Multiple StockItem.release() calls + order status update |
| `WarehouseService.create()` | Implicit (single save) | — |
| `ProductService.create()` | Implicit (single save) | — |
| `StockService.adjustQuantity()` | Implicit (single save) | — |
| `AuthenticationService.login()` | **No** (read-only) | Exception propagates to GlobalExceptionHandler |

---

## 6. Concurrency Architecture — Detailed Trace

### 6.1 Statelessness of Services

Every `@Service` and `@Component` bean is a Spring **singleton** — one instance shared across all concurrent requests. This is only safe because none of them hold mutable instance state; all request-specific data flows through method parameters and local variables.

**Rule: Never add a mutable instance field to a service class.**

`FulfillmentRoutingService` and `ConsolidationPlanner` are especially important — pure and stateless, calling them concurrently is trivially safe.

### 6.2 Two-Thread Trace of the Race Condition

Setup: StockItem for (Warehouse1, ProductA) has `quantity = 10`, `reservedQuantity = 0`, `version = 5`. Two customers each order 8 units simultaneously.

```
Time   Thread A                              Thread B
----   --------                              --------
t0     OrderService.placeOrder() begins      OrderService.placeOrder() begins
t1     reads StockSnapshot: available=10     reads StockSnapshot: available=10
t2     routing: allocate 8 from W1           routing: allocate 8 from W1
t3     loads StockItem entity (version=5)
t4                                           loads StockItem entity (version=5)
t5     stockItem.reserve(8)
       → reservedQuantity becomes 8
t6     flush/commit: UPDATE stock_item
       SET reserved_quantity=8, version=6
       WHERE id=... AND version=5
       → 1 row affected. COMMIT succeeds.
t7                                           stockItem.reserve(8)
                                             → reservedQuantity becomes 8
                                             (Thread B's OWN in-memory copy, still version=5)
t8                                           flush/commit: UPDATE stock_item
                                             SET reserved_quantity=8, version=6
                                             WHERE id=... AND version=5
                                             → 0 rows affected (version is now 6!)
                                             → ObjectOptimisticLockingFailureException
t9                                           Spring Retry catches it, transaction rolls back
                                             placeOrder() RE-INVOKED from t0
t10                                          re-reads StockSnapshot: available=2
                                             (10 - 8 reserved by Thread A)
t11                                          routing: allocate 2 from W1 (or backorder)
t12                                          commits successfully with correct data
```

**Property guaranteed:** At no point does the sum of reservedQuantity exceed physical quantity.

### 6.3 Connection Pool Sizing

Each concurrent request holds one connection for the duration of its transaction. Keep transactions **as short as possible** — no external calls (Twilio, HTTP) inside transactions.

---

## 7. Exception Architecture

### 7.1 Exception Hierarchy

```
RuntimeException
├── ApiException (abstract base, carries HTTP status + error code)
│   ├── EntityNotFoundException        → 404 NOT_FOUND
│   ├── IllegalStateTransitionException → 409 ILLEGAL_STATE_TRANSITION
│   ├── StockConflictException         → 409 STOCK_CONFLICT
│   ├── AccessDeniedException (Spring's) → 403 ACCESS_DENIED
│   └── ValidationException            → 400 VALIDATION_ERROR
├── ObjectOptimisticLockingFailureException (Spring/Hibernate)
│   → caught internally by @Retryable, NEVER reaches GlobalExceptionHandler
│     directly except via @Recover → StockConflictException
└── Unchecked infra exceptions (DataAccessException subclasses)
    → catch-all handler → 500 INTERNAL_ERROR, logged with full stack trace
```

### 7.2 Propagation Rules

- Domain exceptions are constructed and thrown from the **service layer only**
- `Optional.empty()` from repository → translated to `EntityNotFoundException` by calling service
- `ObjectOptimisticLockingFailureException` is **expected under normal operation** — never logged as error-level on every occurrence, only on final exhaustion via `@Recover`
- `GlobalExceptionHandler` is the **only class** permitted to construct `ErrorResponse` or decide HTTP status
- **Never catch and swallow silently** except `TwilioSmsClient.send` (deliberate exception)

### 7.3 Why Backorder Is Not an Exception

`PARTIALLY_ALLOCATED` is a valid, successful **200 OK** response. Only genuine failures (bad input, illegal transitions, unrecoverable contention, missing entities) are exceptions.

---

## 8. Configuration Architecture

### 8.1 Profile Structure

| Profile | Used for | Database | Notable overrides |
|---------|----------|----------|-------------------|
| `dev` | Local development | Local Postgres (via Docker Compose) | `logging.level.com.smartroute=DEBUG`, Swagger enabled |
| `test` | Automated test runs | Testcontainers-managed Postgres | Flyway runs fresh, `show-sql=true` |
| `prod-like` / `docker` | Full docker-compose stack | Containerized Postgres | Swagger disabled, DEBUG off, pool sized explicitly |

### 8.2 application.yml (shared baseline)

```yaml
spring:
  application:
    name: smartroute
  jpa:
    hibernate:
      ddl-auto: validate  # NEVER 'update' — Flyway owns schema
    properties:
      hibernate:
        jdbc.batch_size: 20
        order_inserts: true
        order_updates: true
  flyway:
    enabled: true
    locations: classpath:db/migration
  datasource:
    hikari:
      maximum-pool-size: 10
      connection-timeout: 3000  # fail fast

server:
  port: 8080
  error:
    include-message: never  # GlobalExceptionHandler owns error body shape

jwt:
  secret: ${JWT_SECRET}
  access-token-expiry-minutes: 15
  refresh-token-expiry-days: 7

routing:
  weights:
    distance: 0.4
    cost: 0.3
    shortfall: 0.3
  consolidation-beta: 0.05
  max-candidates-per-line: 15
  max-candidate-radius-km: 300

twilio:
  account-sid: ${TWILIO_ACCOUNT_SID}
  auth-token: ${TWILIO_AUTH_TOKEN}
  from-number: ${TWILIO_FROM_NUMBER}
```

**`ddl-auto: validate` is deliberate and important** — Hibernate checks entities match Flyway-managed schema at startup and fails fast if they've drifted.

### 8.3 Why Routing Weights Are Externalized

`routing.weights.*` binding to a `@ConfigurationProperties(prefix = "routing")` class means weights can be tuned per-environment without code change or redeploy.

---

## 9. Security Filter Chain Architecture

### 9.1 Exact Filter Ordering

```
1. CorsFilter (if cross-origin frontend)
2. JwtFilter (custom)  ← our authentication logic
3. UsernamePasswordAuthenticationFilter (unused/disabled)
4. ExceptionTranslationFilter (Spring's → converts AccessDeniedException to 403)
5. FilterSecurityInterceptor (Spring's → enforces @PreAuthorize / URL rules)
```

`JwtFilter` is registered via `.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)`.

### 9.2 SecurityConfig — Key Bean Wiring

```java
@Configuration
@EnableMethodSecurity  // required for @PreAuthorize to work at all
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // stateless JWT API
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // strength 12
    }
}
```

**STATELESS session policy is load-bearing** — guarantees no server-side session state.

### 9.3 WarehouseAccessGuard — SpEL Integration

```java
@Component("warehouseGuard")
public class WarehouseAccessGuard {
    public boolean canAccess(UUID warehouseId, Authentication principal) {
        UUID userId = ((JwtPrincipal) principal.getPrincipal()).userId();
        return userRepository.isAssignedToWarehouse(userId, warehouseId);
    }

    public boolean canAccessAllocation(UUID allocationId, Authentication principal) {
        UUID warehouseId = orderAllocationRepository.findWarehouseIdById(allocationId);
        return canAccess(warehouseId, principal);
    }
}
```

**`@Component("warehouseGuard")` bean name must match exactly** what's referenced in `@PreAuthorize("@warehouseGuard.canAccess(...)")` SpEL expressions.

---

## 10. Deployment & Network Architecture

### 10.1 Container Topology

```
┌─────────────────────────────────────────┐
│       Docker network: default           │
│                                         │
Host:8080 ──────┼──> [app container] :8080   │
│               │                         │
│               │ JDBC (internal: "postgres") │
│               ▼                         │
Host:5432 ──────┼──> [postgres container] :5432 │
│               │                         │
│               ▼                         │
│       [named volume: pgdata]            │
└─────────────────────────────────────────┘

[app container] ──HTTPS──> Twilio API (external)
```

### 10.2 Startup Ordering

`app` declares `depends_on: postgres: condition: service_healthy`. The healthcheck (`pg_isready`) ensures Postgres is actually accepting connections before Flyway runs.

### 10.3 Environment Variable Flow

```
.env file (git-ignored) → docker-compose.yml → container env vars → Spring Boot ${VAR_NAME} → Beans
```

Missing required variable → `BeanCreationException` at startup (correct fail-fast behavior).

---

## 11. Failure Mode Catalog

### 11.1 Concurrency & Data Integrity

| Failure mode | Cause | Prevention | What to verify |
|-------------|-------|------------|----------------|
| **Overselling stock** | Two requests read stale quantity before either writes | `@Version` optimistic lock + whole-use-case retry | Run concurrency test with real thread counts |
| **Retry re-uses stale plan** | Retry scoped to DB write only, not routing | Retry boundary wraps re-fetch + re-route + persist | Confirm `@Retryable` sits on `OrderService.placeOrder`, not `StockAllocationExecutor` |
| **Deadlock between two orders** | Two transactions lock same StockItem rows in opposite order | Always acquire/update StockItem rows sorted by `StockItem.id` | Add sort in `StockAllocationExecutor` |
| **Negative reservedQuantity or quantity** | Bug in release/cancel logic | DB-level CHECK constraints + entity-level guard methods | Never write raw UPDATE outside guarded entity methods |
| **Long-held DB connection starves pool** | External call (Twilio) made inside `@Transactional` | Twilio only called from non-transactional scheduled job | Grep for any HTTP/Twilio call inside `@Transactional` class |

### 11.2 Order Lifecycle

| Failure mode | Cause | Prevention | What to verify |
|-------------|-------|------------|----------------|
| **Order stuck in wrong status** | Code bypasses OrderState/OrderStateService | All status mutation goes through `OrderStateService`; `Order.status` setter should be package-private | Search for direct `.setStatus()` calls outside `domain/state/*` |
| **Order advances to SHIPPED while one allocation is still ALLOCATED** | Aggregation check not implemented | Order-level transition only fires after checking ALL sibling allocations | Test: 2-warehouse split, ship only one allocation → assert order status unchanged |
| **Cancelling a SHIPPED order** | Missing guard on cancellation | `OrderStateService.cancel` checks pre-SHIPPED status | Test: cancel SHIPPED order → expect 409 |

### 11.3 Routing Algorithm

| Failure mode | Cause | Prevention | What to verify |
|-------------|-------|------------|----------------|
| **Division by zero in normalization** | All candidates equidistant/equal-cost | Explicit `0.5` fallback | Unit test: equidistant warehouses |
| **Consolidation DP explodes in runtime** | Candidate pre-filter not applied, k unbounded | `ConsolidationPlanner` guards `k > 15` → skips DP | Test with >15 warehouses, assert routing completes quickly |
| **Over-allocation** | Off-by-one in greedy loop | `take = Math.min(remaining, s.available())` | Property-based test: `sum(allocated) <= requested` |
| **Score breakdown missing in persisted allocation** | scoreBreakdown not serialized before save | `StockAllocationExecutor` must serialize ScoreBreakdown to JSON | Integration test: GET /orders/{id} includes non-null scoreBreakdown |

### 11.4 Security

| Failure mode | Cause | Prevention | What to verify |
|-------------|-------|------------|----------------|
| **Manager accesses another warehouse's stock** | Role check present but warehouse-scoping missing | `@PreAuthorize` combines role AND `@warehouseGuard` check | Test: manager A → 403 on warehouse B endpoint |
| **JWT accepted after expiry** | Missing expiry check | Library-level (jjwt) expiry validation | Test with manually-expired token → 401 |
| **Password logged in plaintext** | Debug logging of request bodies | Never log full request bodies for `/auth/**` | Search logs after login test for raw password |
| **Refresh token reused after logout** | No server-side revocation check | Refresh tokens stored hashed server-side; validation checks against stored hash | Test: refresh token after revoke → rejected |

### 11.5 Configuration & Deployment

| Failure mode | Cause | Prevention | What to verify |
|-------------|-------|------------|----------------|
| **App crash-loops on docker compose up** | Postgres not ready when app starts | `depends_on: condition: service_healthy` | Fresh `docker compose up --build` from clean state |
| **Schema drift** | `ddl-auto` set to `update` | `ddl-auto: validate` enforced permanently; all changes via Flyway | Startup fails if entities and schema disagree |
| **Secrets committed to git** | `.env` not git-ignored | `.gitignore` includes `.env`; only `.env.example` committed | `git log --all -- .env` returns nothing |
| **Twilio outage takes down unrelated functionality** | Twilio call made synchronously inside unrelated path | Twilio isolated to `ReorderAlertJob` only, wrapped in try/catch | Break Twilio credentials → confirm order placement unaffected |

---

## 12. Class Dependency Graph

```
OrderController
└──> OrderService
     ├──> StockItemRepository (read: candidate snapshots)
     ├──> CustomerRepository (read: customer)
     ├──> RoutingStrategy (interface) (pure computation)
     │    └──> DistanceCostStrategy
     │         └──> ConsolidationPlanner
     └──> StockAllocationExecutor
          ├──> OrderRepository (write: Order, OrderLine)
          ├──> OrderAllocationRepository (write: OrderAllocation)
          ├──> StockItemRepository (write: quantity/reserved, @Version checked)
          └──> OrderStateService
               └──> OrderState implementations

OrderController (transitions)
└──> OrderStateService
     ├──> OrderRepository
     └──> OrderAllocationRepository

ReorderAlertJob
└──> ReorderAlertService
     ├──> StockItemRepository (read-only)
     └──> TwilioSmsClient

AuthController
└──> AuthenticationService
     ├──> UserRepository
     ├──> PasswordEncoder
     └──> JwtService

JwtFilter (cross-cutting, runs before all controllers)
└──> JwtService
```

**Visual confirmation of the dependency rule:** `RoutingStrategy` has **zero outgoing arrows to any repository**. If during implementation an arrow would need to be drawn from `DistanceCostStrategy` to any `*Repository`, the layering has been violated.

---

## 13. Implementation Guardrail Checklist

- [ ] `FulfillmentRoutingService`, `DistanceCostStrategy`, `ConsolidationPlanner` have **zero Spring/JPA imports**
- [ ] `@Retryable` is on `OrderService.placeOrder` and `OrderStateService.cancel`, **not** on any inner persistence-only method
- [ ] `ddl-auto` is `validate` in every profile, **never** `update`
- [ ] Every StockItem mutation goes through a guarded entity method (`reserve`, `release`, `deduct`), **never** a raw setter
- [ ] Every order status mutation goes through `OrderStateService`, **never** a direct `order.setStatus(...)`
- [ ] `TwilioSmsClient.send` is the only place a Twilio call is ever made, and it **never throws upward**
- [ ] `@PreAuthorize` on any warehouse-scoped endpoint checks both role AND `@warehouseGuard`, **not role alone**
- [ ] `JwtFilter` is registered with `.addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)`
- [ ] `docker-compose.yml` has `depends_on.postgres.condition: service_healthy` on the `app` service
- [ ] `.env` is listed in `.gitignore` before the first commit with real secret values
- [ ] The concurrency test exists and passes before Week 2 is considered complete
- [ ] `StockAllocationExecutor` acquires/updates multiple StockItem rows in a **consistent sort order** (by StockItem.id) to avoid deadlocks

---

## 14. Appendix: Cross-Reference to Main Specification

| Topic | Main spec section |
|-------|-------------------|
| Routing algorithm math and complexity | Section 10 |
| Entity field-level specification | Section 7 |
| Full database schema (DDL) | Section 14 |
| Design pattern rationale | Section 11 |
| Testing code samples | Section 16 |
| Three-week build plan | Section 21 |
| Viva Q&A preparation | Section 23 |