# STRIDE — Project Specification (Full Reference)

> **Source**: STRIDE_Project_Specification.pdf (56 pages)
> **Author**: Abhinand Baiju Smitha — Presidency University, CSE

---

## 1. Executive Summary

STRIDE is a backend-first supply chain fulfillment platform built on **Java 17** and **Spring Boot 3**, designed to solve a problem that most academic inventory-management projects deliberately avoid: **deciding how an order should actually be fulfilled when stock is spread across multiple warehouses**.

Where a typical CRUD-based inventory project stops at "check quantity, subtract quantity," STRIDE implements an **explainable, tunable fulfillment routing engine** that:

- **Scores** candidate warehouses for each order line using a weighted combination of distance, cost, and stock shortfall.
- **Splits** an order across warehouses only when no single warehouse can serve it economically, using a **bitmask dynamic programming consolidation step** to avoid unnecessary shipment fragmentation.
- Handles **concurrent checkout races** correctly using optimistic locking (`@Version`) with a retry boundary that re-runs the entire routing decision, not just the database write.
- Exposes the whole system through a **secured, documented, tested REST API**.

The project is deliberately scoped as **one Spring Boot service done deeply**, rather than a sprawling microservice architecture.

---

## 2. Problem Statement & Motivation

### 2.1 The Real-World Problem

Multi-location retailers and distributors face a decision that looks simple but isn't: a customer places an order, and the system must decide **which warehouse (or combination of warehouses)** fulfills it.

Naive systems break down because:

1. **The nearest warehouse doesn't have enough stock.** The naive system either rejects the order or silently backorders it, when a nearby-but-not-nearest warehouse could have filled it completely.
2. **Splitting is sometimes right, sometimes wrong.** Splitting an order across two warehouses can reduce total shipping cost per unit, but also means two shipments and worse customer experience.
3. **Concurrent orders compete for the same stock.** During a flash sale, two orders can both "see" the same available unit and both try to claim it.

### 2.2 Why This Is a Good Final-Year Project

STRIDE hits four evaluation criteria:
- A **real algorithmic decision**, not just data movement (CRUD)
- **Correct handling of concurrency**
- **Deliberate use of OOP and design patterns** to solve actual structural problems
- A **testing strategy** that proves the hard parts actually work

### 2.3 Non-Goals (Out of Scope)

- Full route optimization / vehicle routing (this is a warehouse selection problem)
- Machine-learning-based demand forecasting (Future Work only)
- Production-grade payment gateway integration (stubbed/mocked)
- Multi-tenant SaaS support (single-organization system)

---

## 3. Originality & Differentiation

| Aspect | Typical tutorial project | STRIDE |
|--------|------------------------|--------|
| Fulfillment decision | Implicit — first/only warehouse | Explicit scoring + greedy + DP consolidation |
| Concurrency | Usually absent, or blanket `synchronized` | `@Version` optimistic locking with whole-use-case retry |
| Splitting orders | Not modeled — one order = one shipment | `OrderAllocation` join entity allows multi-warehouse |
| Algorithmic justification | None | Explicit greedy-vs-ILP tradeoff, complexity analysis |
| Testing depth | Manual Postman testing | JUnit unit tests + Testcontainers integration + concurrent race test |

---

## 4. Requirements Specification

### 4.1 Functional Requirements

**FR-1 — Authentication & Authorization**
- FR-1.1. Users register/login and receive JWT access token + refresh token.
- FR-1.2. Every protected endpoint enforces role-based access: `ADMIN`, `WH_MANAGER`, `SUPPLIER`.
- FR-1.3. A `WH_MANAGER` may only view/manage stock for warehouses they are assigned to.
- FR-1.4. A `SUPPLIER` may only view stock and orders relevant to products they supply.

**FR-2 — Master Data Management**
- FR-2.1. `ADMIN` can create, update, deactivate `Warehouse` records (name, address, lat/lng, cost factor).
- FR-2.2. `ADMIN` and `SUPPLIER` can create/update `Product` records (SKU, name, category, unit weight).
- FR-2.3. `WH_MANAGER` can create/update `StockItem` records (product + warehouse + quantity + batch/expiry).

**FR-3 — Order Placement & Fulfillment Routing**
- FR-3.1. A customer-facing endpoint accepts an order (customer + list of product/quantity lines).
- FR-3.2. The system computes a fulfillment plan per order using the routing algorithm.
- FR-3.3. If full coverage is impossible, the uncovered portion is marked `BACKORDERED` and status becomes `PARTIALLY_ALLOCATED`.
- FR-3.4. The order's computed allocation is persisted as `OrderAllocation` records.
- FR-3.5. Stock is decremented atomically and correctly under concurrent order placement (no overselling).

**FR-4 — Order Lifecycle Management**
- FR-4.1. Orders progress through a defined state machine with illegal transitions rejected.
- FR-4.2. `WH_MANAGER` can transition: `ALLOCATED` → `PICKED` → `SHIPPED`.
- FR-4.3. `ADMIN` can cancel an order in any pre-SHIPPED state, releasing reserved stock.

**FR-5 — Reorder Alerts**
- FR-5.1. A scheduled job runs daily, checking each `StockItem` against its product's reorder threshold.
- FR-5.2. Items below threshold trigger an SMS alert (via Twilio) to the relevant `WH_MANAGER`.

**FR-6 — Reporting & Query**
- FR-6.1. Paginated, filterable listing of orders (by status, date range, customer).
- FR-6.2. Paginated, filterable listing of stock (by warehouse, product, below-threshold flag).
- FR-6.3. An endpoint returning the full allocation breakdown for a given order.

### 4.2 Non-Functional Requirements

- **NFR-1 — Correctness under concurrency.** No two concurrent order placements may oversell the same StockItem. Verified with automated concurrency test.
- **NFR-2 — Explainability.** Routing algorithm must be a pure function, unit testable without DB/Spring. Output must include score breakdown for each allocation.
- **NFR-3 — Reasonable performance bound.** Bitmask DP capped at ~15 warehouses per order.
- **NFR-4 — Security baseline.** BCrypt passwords, signed JWT, role checks at method level (`@PreAuthorize`).
- **NFR-5 — Testability.** 100% coverage of routing/consolidation branches. Integration coverage of order placement happy path + backorder + race-condition.
- **NFR-6 — Deployability.** Full system starts with single `docker compose up`.

---

## 5. System Architecture

### 5.1 Layered Architecture

```
┌─────────────────────────────┐
│     REST Controllers        │
│  (OrderController, etc.)    │
└───────────────┬─────────────┘
                │
┌───────────────▼───────────────┐
│     Application Services      │
│  (OrderService orchestrates)  │
└───────┬───────────────┬───────┘
        │               │
┌───────▼───────┐ ┌─────▼─────────────────┐
│ Fulfillment   │ │ StockAllocation       │
│ Routing       │ │ Executor              │
│ Service (PURE)│ │ (DB side effects,     │
│ no Spring,    │ │  @Version retry)      │
│ no DB         │ │                       │
└───────────────┘ └───────┬───────────────┘
                          │
                  ┌───────▼───────────┐
                  │  Repository Layer │
                  │ (Spring Data JPA) │
                  └───────┬───────────┘
                          │
                  ┌───────▼───────────┐
                  │ PostgreSQL DB     │
                  └───────────────────┘
```

**Cross-cutting concerns:**
- Security filter chain (JWT validation) intercepts before the controller layer
- Global exception handler (`@ControllerAdvice`) wraps the controller layer
- Scheduler (`@Scheduled`) runs independently for the reorder-check job
- Twilio client is invoked from the scheduler, not from the core order flow

### 5.2 Package Structure

```
com.smartroute
├── config/          # SecurityConfig, OpenApiConfig, RetryConfig
├── security/        # JwtFilter, JwtService, UserDetailsServiceImpl
├── domain/
│   ├── entity/      # JPA entities
│   ├── enums/       # OrderStatus, Role, AllocationStatus
│   └── state/       # OrderState pattern implementation
├── repository/      # Spring Data JPA repositories
├── routing/
│   ├── FulfillmentRoutingService.java    # pure algorithm
│   ├── RoutingStrategy.java              # Strategy interface
│   ├── DistanceCostStrategy.java         # default implementation
│   ├── ConsolidationPlanner.java         # bitmask DP
│   └── model/       # AllocationPlan, WarehouseScore (DTOs internal to routing)
├── service/
│   ├── OrderService.java                 # orchestration, @Transactional, @Retryable
│   ├── StockAllocationExecutor.java      # DB writes for allocation + stock decrement
│   ├── WarehouseService.java, ProductService.java, StockService.java
│   └── ReorderAlertService.java          # scheduled job logic
├── notification/
│   └── TwilioSmsClient.java
├── web/
│   ├── controller/  # REST controllers
│   ├── dto/         # Request/response DTOs
│   └── exception/   # GlobalExceptionHandler, custom exceptions
└── StrideApplication.java
```

### 5.3 Why the Routing Service Is Isolated

`FulfillmentRoutingService` takes an `OrderRequest` and a `List<StockSnapshot>` (plain Java record, not JPA entity) and returns an `AllocationPlan` (also a plain record). **No Spring annotations, no repository injections, no database access.**

Three reasons:
1. **Testability** — tested with plain JUnit in milliseconds, no Spring context
2. **Correctness under retry** — the entire routing decision must be re-computed on retry, not just the DB write. Pure = safe to call repeatedly.
3. **Strategy substitutability** — depends on `RoutingStrategy` interface, future strategies swap in cleanly

---

## 6. Technology Stack & Justification

| Layer | Choice | Justification |
|-------|--------|---------------|
| Language | Java 17 | LTS; records and pattern matching for routing DTOs |
| Framework | Spring Boot 3.2 | Industry-standard; Security, Data JPA, Retry integrate cleanly |
| Database | PostgreSQL 15 | Row-level locking, SERIALIZABLE/REPEATABLE READ options, JSONB |
| Migrations | Flyway | Versioned schema history — avoids `ddl-auto=update` |
| Security | Spring Security + JJWT | Stateless JWT auth |
| Testing | JUnit 5, Mockito, Testcontainers, REST Assured | Real Postgres in tests, not H2 |
| Retry | Spring Retry (`@Retryable`) | Declarative retry on `ObjectOptimisticLockingFailureException` |
| API docs | springdoc-openapi | Auto-generated, always in sync |
| Notifications | Twilio Java SDK | Reorder alerts via SMS |
| Containerization | Docker + Docker Compose | Single-command startup (NFR-6) |
| Build | Maven | Simpler for single-module project |

**Rejected alternatives:**
- **MongoDB** — domain is inherently relational with strong consistency requirements
- **Pessimistic locking** (`SELECT ... FOR UPDATE`) — serializes all writers, doesn't scale
- **Full ILP solver** (OR-Tools) — unbounded runtime, unacceptable for synchronous API

---

## 7. Domain Model

### 7.1 Entity-Relationship Diagram

```
Customer 1───* Order 1───* OrderLine *───1 Product
                │                          │
                │                          │
                1                          *
                │                          │
                *          StockItem *───1 Warehouse
    OrderAllocation ─────────────────────┘
  (order_line_id, warehouse_id, quantity_allocated)

User (ADMIN / WH_MANAGER / SUPPLIER) *───* Warehouse (manager assignment)
```

### 7.2 Entity Specifications

#### 7.2.1 Warehouse

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | unique, not null |
| address | String | |
| latitude | double | used in distance scoring |
| longitude | double | used in distance scoring |
| costFactor | double | relative operating/shipping cost multiplier, e.g. 1.0 = baseline |
| active | boolean | inactive warehouses excluded from routing candidates |
| createdAt / updatedAt | Instant | audit timestamps |

#### 7.2.2 Product

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| sku | String | unique |
| name | String | |
| category | String | |
| unitWeightKg | double | optional, for future shipping-cost refinement |
| reorderThreshold | int | per-product default; can be overridden per StockItem |

#### 7.2.3 StockItem

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| warehouse | Warehouse | FK, not null |
| product | Product | FK, not null |
| quantity | int | current available quantity |
| reservedQuantity | int | quantity allocated to unshipped orders |
| batchExpiry | LocalDate | nullable — for perishable-goods extension |
| version | long | `@Version` — optimistic locking field, **the single most important column** |

**Design note:** `quantity` tracks physically present stock; `reservedQuantity` tracks stock already promised to open orders. **Available-to-promise = quantity - reservedQuantity.**

#### 7.2.4 Customer

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name, email, phone | String | |
| address | String | |
| latitude, longitude | double | used for distance scoring in routing |

#### 7.2.5 Order

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| customer | Customer | FK |
| status | OrderStatus (enum) | see state machine |
| createdAt | Instant | |
| orderLines | List\<OrderLine\> | one-to-many, cascade persist |

#### 7.2.6 OrderLine

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| order | Order | FK |
| product | Product | FK |
| quantityRequested | int | |
| allocations | List\<OrderAllocation\> | one-to-many; empty until routing runs |

#### 7.2.7 OrderAllocation

The entity that makes **order splitting possible** — the direct output of the routing algorithm.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| orderLine | OrderLine | FK |
| warehouse | Warehouse | FK |
| quantityAllocated | int | |
| scoreBreakdown | JSONB / String | serialized score components — supports NFR-2 (explainability) |
| status | AllocationStatus (enum) | ALLOCATED, PICKED, SHIPPED |

#### 7.2.8 User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | String | unique, used as login |
| passwordHash | String | BCrypt |
| role | Role (enum) | ADMIN, WH_MANAGER, SUPPLIER |
| assignedWarehouses | List\<Warehouse\> | many-to-many, relevant for WH_MANAGER scoping |

---

## 8. Order Lifecycle & State Machine

### 8.1 Order-Level States

```
CREATED ──(routing runs)──> ALLOCATED ──> CONFIRMED ──> PICKED ──> SHIPPED ──> DELIVERED
    │                           │
    │                           └──(partial coverage)──> PARTIALLY_ALLOCATED ──> CONFIRMED ...
    │
    └──(any pre-SHIPPED state)──> CANCELLED
```

### 8.2 Allocation-Level States (per OrderAllocation row)

```
ALLOCATED ──> PICKED ──> SHIPPED
```

An order only advances to `SHIPPED` once **every** `OrderAllocation` under it is `SHIPPED`.

### 8.3 Transition Table

| From | To | Trigger | Guard |
|------|----|---------|-------|
| CREATED | ALLOCATED | routing engine fully covers all lines | all lines fully allocated |
| CREATED | PARTIALLY_ALLOCATED | routing engine partially covers | ≥1 line has uncovered quantity |
| ALLOCATED / PARTIALLY_ALLOCATED | CONFIRMED | WH_MANAGER confirms | role check |
| CONFIRMED | PICKED | all allocations marked picked | role check, allocation states |
| PICKED | SHIPPED | all allocations marked shipped | role check, allocation states |
| SHIPPED | DELIVERED | delivery confirmation | — |
| CREATED / ALLOCATED / PARTIALLY_ALLOCATED / CONFIRMED / PICKED | CANCELLED | ADMIN cancels | releases reservedQuantity |

### 8.4 State Pattern Implementation

```java
public interface OrderState {
    OrderState onEvent(OrderEvent event);
    OrderStatus status();
}

public final class CreatedState implements OrderState {
    @Override
    public OrderState onEvent(OrderEvent event) {
        return switch (event) {
            case ROUTED_FULL -> new AllocatedState();
            case ROUTED_PARTIAL -> new PartiallyAllocatedState();
            case CANCEL -> new CancelledState();
            default -> throw new IllegalStateTransitionException(status(), event);
        };
    }
    @Override public OrderStatus status() { return OrderStatus.CREATED; }
}
```

---

## 9. REST API Design

All endpoints prefixed `/api/v1`. Authentication via `Authorization: Bearer <jwt>` except `/auth/**`.

### 9.1 Auth

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /auth/register | public | create a user |
| POST | /auth/login | public | returns access + refresh token |
| POST | /auth/refresh | public (valid refresh token) | rotates access token |

### 9.2 Warehouses

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /warehouses | any authenticated | list, paginated |
| POST | /warehouses | ADMIN | create |
| PUT | /warehouses/{id} | ADMIN | update |
| DELETE | /warehouses/{id} | ADMIN | soft-deactivate |

### 9.3 Products

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /products | any authenticated | list, paginated, filter by category |
| POST | /products | ADMIN, SUPPLIER | create |
| PUT | /products/{id} | ADMIN, SUPPLIER | update |

### 9.4 Stock

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /stock | any authenticated | filter by warehouseId, productId, belowThreshold |
| POST | /stock | WH_MANAGER | create/adjust a StockItem |
| PATCH | /stock/{id}/quantity | WH_MANAGER | manual quantity correction (audited) |

### 9.5 Orders (the core flow)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /orders | any authenticated | places order; triggers routing; returns allocation plan |
| GET | /orders | any authenticated (scoped) | paginated, filter by status/date/customer |
| GET | /orders/{id} | any authenticated (scoped) | full detail with allocations and score breakdown |
| POST | /orders/{id}/confirm | WH_MANAGER | ALLOCATED to CONFIRMED |
| POST | /orders/{id}/allocations/{allocationId}/pick | WH_MANAGER | marks allocation PICKED |
| POST | /orders/{id}/allocations/{allocationId}/ship | WH_MANAGER | marks allocation SHIPPED |
| POST | /orders/{id}/cancel | ADMIN | cancels, releases reserved stock |

#### Example — POST /orders request

```json
{
  "customerId": "c1e6a9f0-...",
  "lines": [
    { "productId": "p-9931", "quantity": 40 },
    { "productId": "p-1042", "quantity": 15 }
  ]
}
```

#### Example — POST /orders response

```json
{
  "orderId": "o-7712",
  "status": "PARTIALLY_ALLOCATED",
  "lines": [
    {
      "productId": "p-9931",
      "quantityRequested": 40,
      "allocations": [
        {
          "warehouseId": "w-BLR-01",
          "quantityAllocated": 30,
          "scoreBreakdown": {
            "normalizedDistance": 0.12,
            "normalizedCost": 0.30,
            "shortfallPenalty": 0.0
          }
        },
        {
          "warehouseId": "w-BLR-04",
          "quantityAllocated": 10,
          "scoreBreakdown": {
            "normalizedDistance": 0.41,
            "normalizedCost": 0.20,
            "shortfallPenalty": 0.25
          }
        }
      ],
      "backorderedQuantity": 0
    },
    {
      "productId": "p-1042",
      "quantityRequested": 15,
      "allocations": [],
      "backorderedQuantity": 15
    }
  ]
}
```

### 9.6 Error Response Shape

```json
{
  "timestamp": "2026-08-12T10:15:30Z",
  "status": 409,
  "error": "STOCK_CONFLICT",
  "message": "Unable to allocate stock after 3 retries due to high contention",
  "path": "/api/v1/orders"
}
```

---

## 10. Core Algorithm Deep Dive: Fulfillment Routing

### 10.1 Problem Formulation

Given an order with lines L = {l1, l2, ..., ln}, each requiring quantity qi of product pi, and a set of warehouses W each holding some quantity of some products, find an assignment of (warehouse, line, quantity) triples that minimizes a weighted cost function while respecting stock constraints.

This is a variant of the **multi-item, multi-source transportation problem** (NP-hard in general via ILP).

### 10.2 Why Not Just Solve the ILP?

1. **Runtime is not bounded.** ILP solve time can spike unpredictably. An order-placement API is synchronous — unbounded solve time is unacceptable.
2. **Disproportionate to problem size.** Real orders have a handful of lines and bounded nearby warehouses.
3. **Sacrifices explainability.** NFR-2 requires per-decision "why" — an LP solver gives a global optimum with no explanation.

**Decision:** Two-phase heuristic — greedy per-line scoring + bounded bitmask DP consolidation — fast, explainable, provably good enough.

### 10.3 Phase 1 — Candidate Filtering

```
candidates(line) = warehouses W such that:
    W.active == true
    AND StockItem(W, line.product).availableToPromise > 0
    AND distance(W, customer) <= MAX_CANDIDATE_RADIUS_KM  // configurable, default 300km
    ORDER BY distance ASC
    LIMIT MAX_CANDIDATES_PER_LINE  // default 15
```

### 10.4 Phase 2 — Per-Line Greedy Scoring

For each order line, each candidate warehouse is scored:

```
score(w) = w1 * dist_norm(w) + w2 * cost_norm(w) + w3 * shortfall(w)
```

Where `dist_norm` and `cost_norm` are **min-max normalized** within the candidate batch:

```
dist_norm(w) = 0.5                                    if max(dist) == min(dist)   [fallback: no signal]
             = (dist(w) - min(dist)) / (max(dist) - min(dist))   otherwise
```

The **0.5 fallback** avoids division-by-zero and encodes "no signal, stay neutral."

```
shortfall(w) = max(0, (needed - available(w)) / needed)
```

**Default weights:** w1 = 0.4, w2 = 0.3, w3 = 0.3 — configurable via `application.yml`.

**Greedy allocation:** Sort candidates ascending by score; allocate from best-scoring first, consuming available stock, moving to next only if line not fully covered. Remaining = `backorderedQuantity`.

### 10.5 Phase 3 — Basket-Level Consolidation (Bitmask DP)

Line-by-line greedy can fragment unnecessarily. This phase corrects for that.

Let the union of candidate warehouses across all lines be C = {c1, ..., ck}, with k bounded to ≤ 15.

For each subset S ⊆ C (represented as a bitmask):

```
totalScore(S) = Σ(scores of allocations within S) - β * (kmax - |S|)
```

Where β (consolidation beta, default 0.05) controls preference for fewer shipments.

```
for mask in 1 .. (1 << k) - 1:
    subset = warehousesInMask(mask, candidates)
    if canCoverAllLines(subset, orderLines):
        plan = bestAllocationWithinSubset(subset, orderLines)
        score = totalScore(plan) - consolidationBonus(popcount(mask))
        if score < bestScoreSoFar:
            bestScoreSoFar = score
            bestPlan = plan
```

**Complexity:** O(2^k * L) where k ≤ 15 and L = number of order lines.

### 10.6 Complexity Summary

| Phase | Technique | Complexity |
|-------|-----------|------------|
| 1. Candidate filtering | sort + limit | O(n log n) per line |
| 2. Per-line greedy | normalize + sort + consume | O(k log k) per line |
| 3. Basket consolidation | bitmask DP | O(2^k * L), k ≤ 15 |
| Alternative (rejected) | exact ILP | worst case exponential, no runtime guarantee |

### 10.7 Reference Implementation (Java)

```java
public record StockSnapshot(UUID warehouseId, UUID productId, int available,
                            double latitude, double longitude, double costFactor) {}

public record LineRequest(UUID productId, int quantityRequested) {}

public record ScoreBreakdown(double normalizedDistance, double normalizedCost, double shortfall) {
    double total(double w1, double w2, double w3) {
        return w1 * normalizedDistance + w2 * normalizedCost + w3 * shortfall;
    }
}

public record AllocationEntry(UUID warehouseId, UUID productId, int quantity,
                              ScoreBreakdown breakdown) {}

public record AllocationPlan(List<AllocationEntry> entries,
                             Map<UUID, Integer> backorderedByProduct) {}

public interface RoutingStrategy {
    AllocationPlan route(Customer customer, List<LineRequest> lines,
                         List<StockSnapshot> candidates);
}
```

**DistanceCostStrategy** — Full implementation:

```java
public final class DistanceCostStrategy implements RoutingStrategy {
    private static final double W_DIST = 0.4, W_COST = 0.3, W_SHORTFALL = 0.3;
    private static final int MAX_CANDIDATES_PER_LINE = 15;

    @Override
    public AllocationPlan route(Customer customer, List<LineRequest> lines,
                                List<StockSnapshot> allCandidates) {
        // Phase 1 + 2: per-line greedy
        List<AllocationEntry> greedyEntries = new ArrayList<>();
        Map<UUID, Integer> backordered = new HashMap<>();

        for (LineRequest line : lines) {
            List<StockSnapshot> candidates = allCandidates.stream()
                .filter(s -> s.productId().equals(line.productId()) && s.available() > 0)
                .sorted(Comparator.comparingDouble(s -> distance(s, customer)))
                .limit(MAX_CANDIDATES_PER_LINE)
                .toList();

            int remaining = line.quantityRequested();
            double minDist = candidates.stream().mapToDouble(s -> distance(s, customer)).min().orElse(0);
            double maxDist = candidates.stream().mapToDouble(s -> distance(s, customer)).max().orElse(0);
            double minCost = candidates.stream().mapToDouble(StockSnapshot::costFactor).min().orElse(0);
            double maxCost = candidates.stream().mapToDouble(StockSnapshot::costFactor).max().orElse(0);

            List<StockSnapshot> ranked = candidates.stream()
                .sorted(Comparator.comparingDouble(s ->
                    scoreOf(s, customer, remaining, minDist, maxDist, minCost, maxCost)))
                .toList();

            for (StockSnapshot s : ranked) {
                if (remaining <= 0) break;
                int take = Math.min(remaining, s.available());
                if (take <= 0) continue;
                ScoreBreakdown breakdown = breakdownOf(s, customer, remaining,
                    minDist, maxDist, minCost, maxCost);
                greedyEntries.add(new AllocationEntry(s.warehouseId(), s.productId(),
                    take, breakdown));
                remaining -= take;
            }
            if (remaining > 0) {
                backordered.merge(line.productId(), remaining, Integer::sum);
            }
        }

        AllocationPlan greedyPlan = new AllocationPlan(greedyEntries, backordered);

        // Phase 3: attempt consolidation
        AllocationPlan consolidated = ConsolidationPlanner.tryConsolidate(
            customer, lines, allCandidates, greedyPlan);
        return consolidated != null ? consolidated : greedyPlan;
    }

    private double distance(StockSnapshot s, Customer c) {
        return haversineKm(s.latitude(), s.longitude(), c.getLatitude(), c.getLongitude());
    }

    private double scoreOf(StockSnapshot s, Customer c, int needed,
                           double minDist, double maxDist, double minCost, double maxCost) {
        double dNorm = (maxDist == minDist) ? 0.5
            : (distance(s, c) - minDist) / (maxDist - minDist);
        double cNorm = (maxCost == minCost) ? 0.5
            : (s.costFactor() - minCost) / (maxCost - minCost);
        double shortfall = Math.max(0, (needed - s.available()) / (double) needed);
        return W_DIST * dNorm + W_COST * cNorm + W_SHORTFALL * shortfall;
    }

    private ScoreBreakdown breakdownOf(StockSnapshot s, Customer c, int needed,
                                       double minDist, double maxDist,
                                       double minCost, double maxCost) {
        double dNorm = (maxDist == minDist) ? 0.5
            : (distance(s, c) - minDist) / (maxDist - minDist);
        double cNorm = (maxCost == minCost) ? 0.5
            : (s.costFactor() - minCost) / (maxCost - minCost);
        double shortfall = Math.max(0, (needed - s.available()) / (double) needed);
        return new ScoreBreakdown(dNorm, cNorm, shortfall);
    }

    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
```

### 10.8 ConsolidationPlanner (Bitmask DP)

```java
public final class ConsolidationPlanner {
    private static final double CONSOLIDATION_BETA = 0.05;

    public static AllocationPlan tryConsolidate(Customer customer, List<LineRequest> lines,
                                                List<StockSnapshot> allCandidates,
                                                AllocationPlan baseline) {
        List<UUID> candidateWarehouses = allCandidates.stream()
            .map(StockSnapshot::warehouseId).distinct().limit(15).toList();
        int k = candidateWarehouses.size();
        if (k == 0 || k > 15) return null;

        double bestScore = Double.MAX_VALUE;
        AllocationPlan bestPlan = null;

        for (int mask = 1; mask < (1 << k); mask++) {
            List<UUID> subset = warehousesInMask(mask, candidateWarehouses);
            AllocationPlan attempt = allocateWithinSubset(customer, lines, allCandidates, subset);
            if (attempt == null) continue;
            if (totalBackordered(attempt) > totalBackordered(baseline)) continue;
            double score = totalRawScore(attempt) - CONSOLIDATION_BETA * (15 - Integer.bitCount(mask));
            if (score < bestScore) {
                bestScore = score;
                bestPlan = attempt;
            }
        }
        return bestPlan;
    }

    private static List<UUID> warehousesInMask(int mask, List<UUID> all) {
        List<UUID> result = new ArrayList<>();
        for (int i = 0; i < all.size(); i++) {
            if ((mask & (1 << i)) != 0) result.add(all.get(i));
        }
        return result;
    }
}
```

---

## 11. OOP Design & Design Patterns

### 11.1 Strategy Pattern — RoutingStrategy

`FulfillmentRoutingService` depends on `RoutingStrategy` interface (injected via Spring). Swapping `DistanceCostStrategy` for a different implementation requires zero changes outside a configuration bean.

### 11.2 State Pattern — OrderState

Prevents illegal order-status transitions by encoding the transition table into the type system.

### 11.3 Builder Pattern — AllocationPlanBuilder

```java
public final class AllocationPlanBuilder {
    private final List<AllocationEntry> entries = new ArrayList<>();
    private final Map<UUID, Integer> backordered = new HashMap<>();

    public AllocationPlanBuilder addEntry(AllocationEntry entry) {
        entries.add(entry); return this;
    }
    public AllocationPlanBuilder addBackorder(UUID productId, int qty) {
        backordered.merge(productId, qty, Integer::sum); return this;
    }
    public AllocationPlan build() {
        return new AllocationPlan(List.copyOf(entries), Map.copyOf(backordered));
    }
}
```

### 11.4 Single Responsibility — Three-Way Split

- `FulfillmentRoutingService` (decides) → routing logic changes only here
- `StockAllocationExecutor` (persists + retries) → persistence changes only here
- `OrderService` (orchestrates + state transitions) → workflow changes only here

### 11.5 Composition Over Inheritance

No `Location` or `Inventory` base class. The domain does not have a natural "is-a" hierarchy.

### 11.6 Repository Pattern (via Spring Data JPA)

Each aggregate root has its own `JpaRepository`.

---

## 12. Concurrency & Data Consistency

### 12.1 The Race Condition

Two customers order the last unit from the same warehouse simultaneously. Both read `quantity = 1`. Both compute valid allocation. Both attempt to decrement to 0. Without protection, **both succeed** = oversell.

### 12.2 Why Optimistic Locking, Not Pessimistic

| Approach | Behavior | Tradeoff |
|----------|----------|----------|
| Pessimistic (`SELECT ... FOR UPDATE`) | First transaction locks row; others block | Serializes all writers — poor throughput |
| **Optimistic (`@Version`)** | Every transaction reads freely; on write, DB checks version hasn't changed | Higher throughput; pays retry cost only on actual conflict |

```java
@Entity
public class StockItem {
    @Id @GeneratedValue private UUID id;
    // ... other fields
    @Version
    private long version;
}
```

Under the hood, JPA issues:
```sql
UPDATE stock_item SET quantity = ?, reserved_quantity = ?, version = version + 1
WHERE id = ? AND version = ?;
```

If WHERE matches zero rows → `ObjectOptimisticLockingFailureException`.

### 12.3 Retry Scope — the Detail Most Implementations Get Wrong

**Wrong:** Wrap only the repository `save()` call in a retry. The in-memory entity still reflects stale data.

**Correct:** The retry must re-run the **entire use case** — re-fetch fresh stock, re-run routing, then persist:

```java
@Service
public class OrderService {
    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 50, multiplier = 2)
    )
    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        List<StockSnapshot> freshStock = stockRepository.findCandidateSnapshots(request.lines());
        AllocationPlan plan = routingService.route(request.customer(), request.lines(), freshStock);
        Order order = allocationExecutor.persistOrderWithAllocations(request, plan);
        return OrderMapper.toResponse(order);
    }

    @Recover
    public OrderResponse recoverFromContention(
            ObjectOptimisticLockingFailureException ex, OrderRequest request) {
        throw new StockConflictException("Unable to allocate stock after repeated contention", ex);
    }
}
```

### 12.4 Reserved vs. Available Quantity

- **On allocation:** `reservedQuantity += allocatedAmount` (physical quantity untouched)
- **On shipment:** `quantity -= allocatedAmount; reservedQuantity -= allocatedAmount`
- **On cancellation before shipment:** `reservedQuantity -= allocatedAmount` (release hold)
- **Available-to-promise** for routing = `quantity - reservedQuantity`

### 12.5 Isolation Level

`READ COMMITTED` (Postgres default) is sufficient given the explicit optimistic-locking design.

---

## 13. Security Design

### 13.1 Authentication Flow

1. `POST /auth/login` — credentials validated against `passwordHash` (BCrypt, strength 12)
2. On success, issue short-lived **access token** (JWT, 15 min expiry) and longer-lived **refresh token** (7 days, stored hashed server-side for revocation)
3. Every subsequent request includes `Authorization: Bearer <access_token>`
4. A stateless `JwtFilter` (extends `OncePerRequestFilter`) validates signature and expiry, populates `SecurityContext`

```java
public class JwtFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                     FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtService.isValid(token)) {
                var auth = jwtService.buildAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(req, res);
    }
}
```

### 13.2 Authorization — Method-Level, Not Just URL-Level

```java
@PreAuthorize("hasRole('WH_MANAGER') and @warehouseGuard.canAccess(#warehouseId, principal)")
@PatchMapping("/stock/{id}/quantity")
public StockItemResponse adjustQuantity(@PathVariable UUID id,
                                        @RequestBody AdjustQuantityRequest req) { ... }
```

`@warehouseGuard.canAccess(...)` is a custom Spring bean in SpEL — enforces FR-1.3.

### 13.3 Password & Secret Handling

- Passwords hashed with BCrypt before storage; plaintext never logged
- JWT signing secret loaded from environment variable, never committed
- Refresh tokens stored as a hash (not plaintext)

---

## 14. Database Schema (Flyway Migration)

```sql
-- V1__init_schema.sql

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'WH_MANAGER', 'SUPPLIER')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouse (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) UNIQUE NOT NULL,
    address     VARCHAR(500),
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    cost_factor DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouse_manager (
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (warehouse_id, user_id)
);

CREATE TABLE product (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku               VARCHAR(100) UNIQUE NOT NULL,
    name              VARCHAR(255) NOT NULL,
    category          VARCHAR(100),
    unit_weight_kg    DOUBLE PRECISION,
    reorder_threshold INT NOT NULL DEFAULT 10
);

CREATE TABLE stock_item (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id      UUID NOT NULL REFERENCES warehouse(id),
    product_id        UUID NOT NULL REFERENCES product(id),
    quantity          INT NOT NULL CHECK (quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    batch_expiry      DATE,
    version           BIGINT NOT NULL DEFAULT 0,
    UNIQUE (warehouse_id, product_id)
);

CREATE TABLE customer (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      VARCHAR(255) NOT NULL,
    email     VARCHAR(255),
    phone     VARCHAR(30),
    address   VARCHAR(500),
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id),
    status      VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_line (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id         UUID NOT NULL REFERENCES product(id),
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0)
);

CREATE TABLE order_allocation (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_line_id       UUID NOT NULL REFERENCES order_line(id) ON DELETE CASCADE,
    warehouse_id        UUID NOT NULL REFERENCES warehouse(id),
    quantity_allocated  INT NOT NULL CHECK (quantity_allocated > 0),
    score_breakdown     JSONB,
    status              VARCHAR(20) NOT NULL DEFAULT 'ALLOCATED'
);

CREATE INDEX idx_stock_item_warehouse_product ON stock_item(warehouse_id, product_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_order_line_order ON order_line(order_id);
CREATE INDEX idx_allocation_order_line ON order_allocation(order_line_id);
CREATE INDEX idx_stock_reorder_check ON stock_item(product_id) WHERE reserved_quantity > 0;
```

**Design notes:**
- `UNIQUE (warehouse_id, product_id)` on `stock_item` guarantees one row per warehouse/product pair
- `CHECK (quantity >= 0)` and `CHECK (reserved_quantity >= 0)` are a second line of defense against bugs
- `score_breakdown JSONB` supports NFR-2 (explainability)

---

## 15. DSA Concepts Applied

| Concept | Where | Complexity | Why |
|---------|-------|------------|-----|
| Greedy algorithm | Per-line warehouse selection | O(k log k) per line | Locally optimal, cheap to compute |
| Bitmask DP | Basket-level consolidation | O(2^k * L), k ≤ 15 | Exact search over bounded subset space |
| Min-max normalization | Score computation | O(k) per batch | Keeps distance and cost on same 0-1 scale |
| Hashing (HashMap) | (warehouseId, productId) → StockItem lookup | O(1) average | Avoids repeated linear scans |
| State machine / finite automaton | Order lifecycle | O(1) transition lookup | Encodes legality structurally |
| Exponential backoff | Optimistic-lock retry | bounded by maxAttempts | Standard retry technique |
| Haversine distance | Geographic scoring | O(1) per pair | Accurate at city/regional scale |

---

## 16. Testing Strategy

### 16.1 Philosophy

- The routing algorithm → must be tested as a **pure function**
- The concurrency behavior → must be tested with **real concurrent threads against real Postgres**
- Integration tests → must run against **real Postgres (Testcontainers)**, not H2

### 16.2 Unit Tests — Pure Algorithm (no Spring context)

```java
@Test
void singleWarehouseFullCoverage() {
    var candidates = List.of(
        new StockSnapshot(W1, PRODUCT_A, 100, 12.97, 77.59, 1.0)
    );
    var lines = List.of(new LineRequest(PRODUCT_A, 30));
    AllocationPlan plan = strategy.route(CUSTOMER_BANGALORE, lines, candidates);

    assertThat(plan.entries()).hasSize(1);
    assertThat(plan.entries().get(0).quantity()).isEqualTo(30);
    assertThat(plan.backorderedByProduct()).isEmpty();
}

@Test
void splitsAcrossWarehousesWhenSingleCannotCover() {
    var candidates = List.of(
        new StockSnapshot(W1, PRODUCT_A, 20, 12.97, 77.59, 1.0),
        new StockSnapshot(W2, PRODUCT_A, 25, 13.08, 77.57, 1.2)
    );
    var lines = List.of(new LineRequest(PRODUCT_A, 35));
    AllocationPlan plan = strategy.route(CUSTOMER_BANGALORE, lines, candidates);

    int totalAllocated = plan.entries().stream().mapToInt(AllocationEntry::quantity).sum();
    assertThat(totalAllocated).isEqualTo(35);
    assertThat(plan.entries()).hasSizeGreaterThan(1);
    assertThat(plan.backorderedByProduct()).isEmpty();
}

@Test
void handlesEquidistantWarehousesWithoutDivisionByZero() {
    var candidates = List.of(
        new StockSnapshot(W1, PRODUCT_A, 50, 12.97, 77.59, 1.0),
        new StockSnapshot(W2, PRODUCT_A, 50, 12.97, 77.59, 1.0)
    );
    var lines = List.of(new LineRequest(PRODUCT_A, 10));
    AllocationPlan plan = strategy.route(CUSTOMER_BANGALORE, lines, candidates);

    assertThat(plan.entries()).isNotEmpty();
    plan.entries().forEach(e ->
        assertThat(e.breakdown().normalizedDistance()).isEqualTo(0.5));
}
```

### 16.3 Integration Tests — Testcontainers

```java
@SpringBootTest
@Testcontainers
class OrderPlacementIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Test
    void happyPathFullAllocation() throws Exception {
        seedWarehouseWithStock(WAREHOUSE_1, PRODUCT_A, 50);
        mockMvc.perform(post("/api/v1/orders")
            .contentType(APPLICATION_JSON)
            .content(orderRequestJson(PRODUCT_A, 20)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ALLOCATED"))
            .andExpect(jsonPath("$.lines[0].allocations[0].quantityAllocated").value(20));
    }
}
```

### 16.4 Concurrency Test — The Most Important Test

```java
@Test
void twentyThreadsCompetingForTenUnits() throws Exception {
    seedWarehouseWithStock(WAREHOUSE_1, PRODUCT_A, 10);
    int threads = 20;
    CountDownLatch ready = new CountDownLatch(threads);
    CountDownLatch go = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    List<Future<Integer>> results = new ArrayList<>();

    for (int i = 0; i < threads; i++) {
        results.add(pool.submit(() -> {
            ready.countDown();
            go.await();
            try {
                var response = orderService.placeOrder(singleLineOrder(PRODUCT_A, 1));
                return totalAllocated(response);
            } catch (StockConflictException e) {
                return 0;  // acceptable — rejected under contention, did NOT oversell
            }
        }));
    }
    ready.await();
    go.countDown();  // release all threads simultaneously

    int totalAllocated = 0;
    for (Future<Integer> f : results) totalAllocated += f.get();
    assertThat(totalAllocated).isLessThanOrEqualTo(10);  // THE PROPERTY THAT MATTERS
    StockItem finalStock = stockItemRepository.findByWarehouseAndProduct(WAREHOUSE_1, PRODUCT_A);
    assertThat(finalStock.getReservedQuantity()).isEqualTo(totalAllocated);
}
```

### 16.5 Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Routing/consolidation | 100% branch coverage | Highest-risk, highest-value code |
| Order state machine | 100% of transition table | Illegal transitions must be provably impossible |
| Controllers | Happy path + one failure case per endpoint | Diminishing returns beyond this |
| Concurrency | At least one dedicated race-condition test | Directly proves NFR-1 |

---

## 17. Error Handling & Validation

### 17.1 Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(StockConflictException.class)
    public ResponseEntity<ErrorResponse> handleStockConflict(StockConflictException ex,
                                                             HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "STOCK_CONFLICT", ex.getMessage(), req);
    }

    @ExceptionHandler(IllegalStateTransitionException.class)
    public ResponseEntity<ErrorResponse> handleIllegalTransition(
            IllegalStateTransitionException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "ILLEGAL_STATE_TRANSITION", ex.getMessage(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                            HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Insufficient permissions", req);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String code,
                                                 String message, HttpServletRequest req) {
        var body = new ErrorResponse(Instant.now(), status.value(), code, message,
                                     req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
```

### 17.2 Bean Validation on Input DTOs

```java
public record OrderLineRequest(
    @NotNull UUID productId,
    @Min(1) @Max(10_000) int quantity
) {}

public record OrderRequest(
    @NotNull UUID customerId,
    @NotEmpty @Size(max = 50) @Valid List<OrderLineRequest> lines
) {}
```

---

## 18. Scheduled Jobs & Twilio Reorder Alerts

```java
@Component
public class ReorderAlertJob {
    private final StockItemRepository stockItemRepository;
    private final TwilioSmsClient smsClient;

    @Scheduled(cron = "0 0 6 * * *")  // 6 AM daily
    public void checkReorderThresholds() {
        List<StockItem> lowStock = stockItemRepository.findBelowThreshold();
        Map<Warehouse, List<StockItem>> byWarehouse = lowStock.stream()
            .collect(Collectors.groupingBy(StockItem::getWarehouse));

        byWarehouse.forEach((warehouse, items) -> {
            String summary = items.stream()
                .map(i -> i.getProduct().getSku() + ": " + i.getQuantity() + " left")
                .collect(Collectors.joining(", "));
            warehouse.getManagers().forEach(manager ->
                smsClient.send(manager.getPhone(),
                    "STRIDE alert — " + warehouse.getName() + " low stock: " + summary));
        });
    }
}

@Component
public class TwilioSmsClient {
    @Value("${twilio.from-number}") private String fromNumber;

    public void send(String toNumber, String body) {
        try {
            Message.creator(new PhoneNumber(toNumber), new PhoneNumber(fromNumber), body).create();
        } catch (Exception e) {
            log.warn("Twilio SMS failed for {}: {}", toNumber, e.getMessage());
            // non-fatal — never block the job
        }
    }
}
```

Note: try/catch around Twilio call — third-party network failure must never take down the scheduled job.

---

## 19. DevOps & Deployment

### 19.1 docker-compose.yml

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smartroute
      POSTGRES_USER: smartroute
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smartroute"]
      interval: 5s
      timeout: 5s
      retries: 5
  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/smartroute
      SPRING_DATASOURCE_USERNAME: smartroute
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
    ports: ["8080:8080"]
volumes:
  pgdata:
```

### 19.2 Dockerfile (multi-stage build)

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/smartroute-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 19.3 .env.example

```
DB_PASSWORD=changeme
JWT_SECRET=changeme-use-a-long-random-string
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

Single command: `docker compose up --build` satisfies NFR-6.

---

## 20. Optional Demo Dashboard

A thin React page that:
- Lists open orders with status badges
- On selecting an order, shows a Leaflet.js map plotting customer location and each allocated warehouse
- Provides a simple form to place a test order

---

## 21. Three-Week Build Plan

### Week 1 — Foundations

| Day | Focus |
|-----|-------|
| 1 | Project scaffold, package structure, Flyway migration V1, Docker Compose |
| 2 | Entities + repositories for Warehouse, Product, StockItem, Customer |
| 3 | User entity, Spring Security config, JWT issuance, password hashing |
| 4 | JwtFilter, @PreAuthorize role checks, warehouse-manager scoping guard |
| 5 | CRUD endpoints: Warehouse, Product, Stock (with DTOs + validation), Swagger |
| 6-7 | Buffer/catch-up; write unit tests for everything built so far |

### Week 2 — The Core Differentiator

| Day | Focus |
|-----|-------|
| 8 | StockSnapshot, LineRequest, AllocationPlan records; RoutingStrategy interface |
| 9 | DistanceCostStrategy — Phase 1 + Phase 2 with unit tests |
| 10 | ConsolidationPlanner — bitmask DP, with unit tests |
| 11 | OrderService orchestration, StockAllocationExecutor, @Version + @Retryable wiring |
| 12 | Order state machine (OrderState implementations), transition-guarded endpoints |
| 13 | POST /orders end-to-end wired, integration test for happy path |
| 14 | Concurrency test — THE day to get this working and demo-ready |

### Week 3 — Polish, Proof, Presentation

| Day | Focus |
|-----|-------|
| 15 | Edge-case tests, error handling refinement |
| 16 | Reorder alert job + Twilio wiring |
| 17-18 | Demo dashboard (optional) |
| 19 | Documentation, report finalization |
| 20-21 | Presentation prep, viva rehearsal |

---

## 22-25. Evaluation, Viva Q&A, Future Work, Appendix

See dedicated sections in full PDF for:
- Evaluation criteria mapping
- 10 prepared viva Q&A pairs
- Future work: demand-driven reordering, FEFO, offline ILP, reverse logistics, event-driven notifications, multi-tenant
- Full entity list, glossary, Maven dependencies