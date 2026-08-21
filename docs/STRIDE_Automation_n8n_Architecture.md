# STRIDE — Automation & n8n Workflow Architecture (Full Reference)

> **Source**: STRIDE_Automation_n8n_Architecture.pdf (18 pages)
> **Purpose**: Specifies the event-driven automation layer — how STRIDE emits events and how n8n consumes them for notifications, escalations, and downstream workflows.

---

## 1. Purpose & Scope

The core specification describes STRIDE as a **system of record**: it decides how an order is fulfilled and persists that decision correctly. What it does **not** do on its own is **coordinate what happens next** across other systems and people — notifying a supplier, escalating a stockout, emailing a customer, alerting a warehouse team on Slack.

This document specifies the **automation layer**: how STRIDE (Spring Boot) emits events at meaningful moments, and how n8n consumes those events to orchestrate downstream workflows — without any of that orchestration logic living inside the core backend.

**This is an addition, not a replacement.** Everything in the other two documents still applies.

---

## 2. Why Event-Driven Automation Fits This Domain

### 2.1 The Coordination Problem

After an order is allocated, multiple downstream actions need to happen (email customer, notify warehouse, alert supplier for backordered items). Embedding all of these in the Spring Boot service would:
- Couple notification logic to the order path
- Make every new notification channel a code change + redeploy
- Risk slowing down the critical order-placement path with external calls

### 2.2 Why n8n Specifically

- Self-hosted (no SaaS dependency for a demo)
- Visual workflow editor (powerful for demo)
- Webhook trigger nodes (can consume STRIDE events directly)
- Native Twilio, Slack, email, HTTP Request nodes
- Free and open source

### 2.3 Where This Sits in the Architecture

```
┌─────────────────────────────────────────┐
│            STRIDE (Spring Boot)          │
│                                          │
│  OrderService ──> WebhookEventPublisher  │
│                   (fires AFTER_COMMIT)   │
│                          │               │
└──────────────────────────┼───────────────┘
                           │ HTTP POST (signed)
                           ▼
┌──────────────────────────────────────────┐
│               n8n                         │
│                                           │
│  [Webhook Trigger] → [Verify Sig] → ...  │
│                                           │
└──────────────────────────────────────────┘
```

**Critical architectural constraint:** A slow or down n8n instance must **never** fail an order placement. The webhook is fire-and-forget; failures are logged and swallowed.

---

## 3. Event Catalog

| Event Type | Emitted When | Key Payload Fields |
|-----------|-------------|-------------------|
| `order.allocated` | After successful order placement (full or partial) | orderId, customerId, lines[], allocations[], status |
| `stock.below_threshold` | During reorder-check job, stock below threshold | stockItemId, warehouseId, productId, sku, quantityRemaining, threshold |
| `order.shipped` | All allocations for an order marked SHIPPED | orderId, customerId, warehouseIds[], trackingInfo (optional) |
| `stock.backordered` | An order line couldn't be fully allocated | orderId, productId, sku, quantityBackordered |
| `order.cancelled` | An order is cancelled | orderId, customerId, releasedAllocations[] |

### 3.1 Payload Schemas

#### 3.1.1 order.allocated

```json
{
  "eventId": "evt-uuid",
  "eventType": "order.allocated",
  "timestamp": "2026-08-12T10:15:30Z",
  "payload": {
    "orderId": "o-7712",
    "customerId": "c-1234",
    "customerEmail": "customer@example.com",
    "status": "ALLOCATED",
    "lines": [
      {
        "productId": "p-9931",
        "sku": "SKU-9931",
        "quantityRequested": 40,
        "allocations": [
          { "warehouseId": "w-BLR-01", "warehouseName": "Bangalore Central", "quantityAllocated": 30 },
          { "warehouseId": "w-BLR-04", "warehouseName": "Bangalore South", "quantityAllocated": 10 }
        ]
      }
    ]
  }
}
```

#### 3.1.2 stock.below_threshold

```json
{
  "eventId": "evt-uuid",
  "eventType": "stock.below_threshold",
  "timestamp": "...",
  "payload": {
    "stockItemId": "si-uuid",
    "warehouseId": "w-BLR-01",
    "warehouseName": "Bangalore Central",
    "productId": "p-9931",
    "sku": "SKU-9931",
    "quantityRemaining": 3,
    "threshold": 10
  }
}
```

#### 3.1.3 order.shipped

```json
{
  "eventId": "evt-uuid",
  "eventType": "order.shipped",
  "timestamp": "...",
  "payload": {
    "orderId": "o-7712",
    "customerId": "c-1234",
    "customerEmail": "customer@example.com",
    "shipments": [
      { "warehouseId": "w-BLR-01", "warehouseName": "Bangalore Central" }
    ]
  }
}
```

#### 3.1.4 stock.backordered

```json
{
  "eventId": "evt-uuid",
  "eventType": "stock.backordered",
  "timestamp": "...",
  "payload": {
    "orderId": "o-7712",
    "productId": "p-1042",
    "sku": "SKU-1042",
    "quantityBackordered": 15
  }
}
```

---

## 4. WebhookEventPublisher Design

### 4.1 Responsibility & Placement

`WebhookEventPublisher` is a `@Component` in the `notification` package. It:
1. Serializes the event payload to JSON
2. Signs it with HMAC-SHA256
3. Sends an HTTP POST to the configured n8n webhook URL
4. Logs failures as WARN, **never throws**

### 4.2 Why AFTER_COMMIT, Not a Direct Call

The webhook fires **after the database transaction commits**, using `TransactionSynchronizationManager.registerSynchronization()` with an `afterCommit()` callback.

Why:
- If the transaction rolls back, no event is emitted (correct — nothing happened)
- If the webhook call fails, the order is still persisted (correct — webhook is non-critical)
- If we fired before commit, a successful webhook could report an order that then fails to persist

### 4.3 Reliability: At-Least-Once, Not Exactly-Once

The baseline is **best-effort delivery**. The same event can rarely arrive twice (STRIDE retries a webhook call that actually succeeded but timed out on the response). Each workflow should have an **idempotency check**.

---

## 5. Security: Signing Webhook Payloads

### 5.1 HMAC Signing Scheme

```java
public class WebhookSigner {
    public static String sign(String payload, String secret) {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(key);
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return "sha256=" + Hex.encodeHexString(hash);
    }
}
```

The signature is sent in the `X-STRIDE-Signature` HTTP header. n8n's first Function node verifies this before processing.

### 5.2 Why This Matters

Without signature verification, anyone who discovers the n8n webhook URL could trigger arbitrary notifications (spoofed order confirmations, fake stockout alerts). HMAC ensures only STRIDE can emit valid events.

---

## 6. n8n Workflow Specifications

### 6.1 Workflow 1: order.allocated

```
[Webhook Trigger: /order.allocated]
│
▼
[Function: verify HMAC signature]
│
▼
[Function: idempotency check (has eventId been processed?)]
│
▼
[Send Email: order confirmation to customer with allocation details]
│
▼
[Slack: notify #warehouse-ops channel with order summary and allocated warehouses]
```

### 6.2 Workflow 2: stock.below_threshold

```
[Webhook Trigger: /stock.below_threshold]
│
▼
[Function: verify HMAC signature]
│
▼
[IF: quantityRemaining == 0]
├── (true) ──> [Slack: URGENT — stockout] AND [Email: draft purchase order request]
└── (false) ─> [SMS via Twilio node — OR direct TwilioSmsClient, pick ONE, not both]
│
▼
[Wait node: 24 hours]
│
▼
[HTTP Request: GET back to STRIDE — has restock been logged?]
│
▼
[IF: still unresolved] ──(true)──> [Slack: ESCALATION to admin channel]
```

### 6.3 Workflow 3: order.shipped

```
[Webhook Trigger: /order.shipped]
│
▼
[Function: verify HMAC signature]
│
▼
[Send Email: tracking/shipment confirmation to customer]
│
▼
[HTTP Request: notify (mocked) finance/invoicing endpoint]
```

### 6.4 Workflow 4: stock.backordered

```
[Webhook Trigger: /stock.backordered]
│
▼
[Function: verify HMAC signature]
│
▼
[Send Email: supplier notification with productId/sku/quantityBackordered]
│
▼
[Set node: log as "supplier follow-up" record]
```

### 6.5 Workflow 5: order.cancelled

```
[Webhook Trigger: /order.cancelled]
│
▼
[Function: verify HMAC signature]
│
▼
[Send Email: cancellation confirmation to customer]
│
▼
[Slack: notify warehouse to release any picked-but-not-shipped stock]
```

---

## 7. Idempotency on the n8n Side

Because delivery is at-least-once, the same event can rarely arrive twice. Each workflow's first node after signature verification should be an **idempotency check**: check whether `eventId` has already been processed (key-value check against an n8n data store or Google Sheet), and short-circuit if so.

---

## 8. Reliability Hardening (Future Work): Outbox Pattern

**The Outbox Pattern:** Instead of firing the webhook directly, write the event to an `outbox_event` table within the same transaction as the order placement. A separate poller (`@Scheduled`, every few seconds) reads unprocessed outbox rows and attempts delivery, marking each as sent on success.

This upgrades delivery from best-effort to **guaranteed-eventually**. This is the correct production answer and a good "what would you do differently at scale" viva answer.

---

## 9. Docker Compose Addition

```yaml
n8n:
  image: n8nio/n8n:latest
  ports: ["5678:5678"]
  environment:
    N8N_BASIC_AUTH_ACTIVE: "true"
    N8N_BASIC_AUTH_USER: ${N8N_USER}
    N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD}
    WEBHOOK_URL: "http://localhost:5678/"
  volumes: ["n8n_data:/home/node/.n8n"]
  depends_on:
    app:
      condition: service_started
```

Add `n8n_data` to top-level `volumes:` block. App's environment needs: `N8N_WEBHOOK_BASE_URL: http://n8n:5678/webhook`.

---

## 10. Testing Strategy for the Automation Layer

### 10.1 Unit Test — Signature Generation

```java
@Test
void generatesConsistentHmacSignature() {
    String payload = "{\"eventType\":\"order.allocated\"}";
    String sig1 = WebhookSigner.sign(payload, "test-secret");
    String sig2 = WebhookSigner.sign(payload, "test-secret");
    assertThat(sig1).isEqualTo(sig2);
    String tamperedSig = WebhookSigner.sign(payload + "x", "test-secret");
    assertThat(tamperedSig).isNotEqualTo(sig1);
}
```

### 10.2 Integration Test — Failure Isolation

**The single most important test for this layer** — proves "a slow or down n8n instance must never fail an order placement":

```java
@Test
void orderPlacementSucceedsEvenWhenWebhookEndpointIsDown() throws Exception {
    // n8nWebhookBaseUrl points to a port nothing is listening on
    seedWarehouseWithStock(WAREHOUSE_1, PRODUCT_A, 50);
    mockMvc.perform(post("/api/v1/orders")
        .contentType(APPLICATION_JSON)
        .content(orderRequestJson(PRODUCT_A, 20)))
        .andExpect(status().isOk());  // order NOT affected by webhook failure
}
```

### 10.3 Manual/Exploratory Verification

- Place an order → observe n8n execution log shows `order.allocated` workflow firing
- Stop n8n container → place order → confirm API still returns 200 OK
- Send request to n8n webhook URL with wrong signature → confirm workflow rejects it

---

## 11. Decision Note: Twilio Integration Point

**Pick ONE, not both** (duplicate SMS would be a real bug):

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **A: Keep direct Twilio in Spring Boot** | `ReorderAlertJob` still calls `TwilioSmsClient` directly; `stock.below_threshold` webhook drives only Slack/email/escalation via n8n | **Recommended for 3-week scope** — fewer moving parts |
| B: Move SMS entirely into n8n | `ReorderAlertJob` never calls Twilio; n8n's Twilio node handles SMS in Workflow 2 | Cleaner separation but adds n8n as hard dependency |

---

## 12. Updated Build Plan Addendum

Insert after Week 3, Day 19 as Days 22-24 extension (or fold into Day 20):

| Day | Focus |
|-----|-------|
| 22 | `WebhookEventPublisher`, event DTOs, HMAC signing utility, unit tests |
| 23 | n8n container added to Docker Compose; build Workflow 1 (`order.allocated`) and Workflow 2 (`stock.below_threshold`) end-to-end |
| 24 | Remaining workflows (shipped, cancelled, backordered), failure-isolation integration test, final demo rehearsal |

**If time is tight:** Implementing only Workflow 1 and 2 fully, with others documented-but-not-built, is a reasonable scope cut.