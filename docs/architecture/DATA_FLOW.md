# Morvexa Nexus — Data Flow & Sequence Specifications

**Document:** `docs/architecture/DATA_FLOW.md`  
**Date:** 2026-10-10  
**Status:** Approved Architectural Baseline (Phase 1)  
**Author:** Morvexa Nexus Principal Software Architecture Team  
**Scope:** End-to-End Sequence Diagrams, Synchronous vs Asynchronous Pipelines, State Transitions  

---

## 1. Authentication & Session Verification Flow

This flow governs access to the Customer Portal (`/portal`) and Nexus Admin Console (`/nexus`).

```
User (Browser)               Next.js Middleware             Supabase Auth SSR          PostgreSQL (Profiles/RBAC)
      │                               │                             │                             │
      │ 1. GET /portal/keys           │                             │                             │
      ├──────────────────────────────>│                             │                             │
      │                               │ 2. Read sb-access-token     │                             │
      │                               │    from HTTP-only cookie    │                             │
      │                               ├────────────────────────────>│                             │
      │                               │                             │ 3. Validate JWT signature   │
      │                               │                             │    & check expiry           │
      │                               │ 4. Return valid user session│                             │
      │                               │<────────────────────────────┤                             │
      │                               │                                                           │
      │                               │ 5. Query user profile & organization membership           │
      │                               ├──────────────────────────────────────────────────────────>│
      │                               │                                                           │ 6. Enforce RLS
      │                               │ 7. Return profile { role, org_id, is_active }             │    (WHERE id = auth.uid())
      │                               │<──────────────────────────────────────────────────────────┤
      │                               │                                                           │
      │                               │ 8. Check RBAC permissions for target route                │
      │                               │    (e.g., if /nexus, require PLATFORM_OWNER or ADMIN)     │
      │                               │                                                           │
      │ 9. Render Authorized Page     │                                                           │
      │<──────────────────────────────┤                                                           │
```

---

## 2. Low-Latency AI Gateway Request & Zero-Buffer Streaming Flow

This sequence illustrates the sub-50ms data plane path during an inference request (`POST /api/v1/messages`).

```
AI Client (cURL / SDK)       Hono Edge Gateway           In-Memory Key Cache         Upstream Provider (Anthropic)    Async Metering Worker
      │                              │                            │                            │                            │
      │ 1. POST /api/v1/messages     │                            │                            │                            │
      │    Authorization: Bearer key │                            │                            │                            │
      ├─────────────────────────────>│                            │                            │                            │
      │                              │ 2. Compute SHA-256(key)    │                            │                            │
      │                              │ 3. Lookup hash in cache    │                            │                            │
      │                              ├───────────────────────────>│                            │                            │
      │                              │ 4. Cache Hit: returns org, │                            │                            │
      │                              │    tier, rate_limit, quota │                            │                            │
      │                              │<───────────────────────────┤                            │                            │
      │                              │                                                         │                            │
      │                              │ 5. Evaluate Edge Rate Limit (Sliding Window RPM)        │                            │
      │                              │ 6. Check Rolling Quota Availability                     │                            │
      │                              │                                                         │                            │
      │                              │ 7. Resolve Model & Provider Route                       │                            │
      │                              │ 8. Forward HTTP POST (stream=true)                      │                            │
      │                              ├────────────────────────────────────────────────────────>│                            │
      │                              │                                                         │                            │
      │                              │ 9. HTTP 200 Streaming Response                          │                            │
      │                              │<────────────────────────────────────────────────────────┤                            │
      │                              │                                                                                      │
      │ 10. SSE Chunk: message_start │                                                                                      │
      │<─────────────────────────────┤                                                                                      │
      │ 11. SSE Chunk: content_delta │ (Zero-buffer SSE pipeline: chunks piped directly to client                           │
      │<─────────────────────────────┤  without intermediate memory buffering)                                              │
      │ 12. SSE Chunk: message_stop  │                                                                                      │
      │<─────────────────────────────┤                                                                                      │
      │                              │                                                                                      │
      │                              │ 13. Stream Complete: Extract TTFT, total latency, prompt & completion token counts   │
      │                              │ 14. Dispatch async telemetry event                                                  │
      │                              ├─────────────────────────────────────────────────────────────────────────────────────>│
      │                              │                                                                                      │ 15. Write to request_logs
      │                              │                                                                                      │ 16. Record tokens in
      │                              │                                                                                      │     rolling_quota_records
      │                              │                                                                                      │ 17. Update usage_aggregates
```

---

## 3. Checkout, Payment Webhook & Subscription Activation Flow

This workflow guarantees financial accuracy, idempotency, and non-repudiation.

```
Customer (Browser)           Morvexa Billing Service      Payment Gateway (Midtrans)     Webhook Receiver         Postgres Financial Ledger
      │                               │                               │                     │                               │
      │ 1. Select Plan "PRO"          │                               │                     │                               │
      │    POST /api/checkout         │                               │                     │                               │
      ├──────────────────────────────>│                               │                     │                               │
      │                               │ 2. Load authoritative price   │                     │                               │
      │                               │    from plans table (IDR)     │                     │                               │
      │                               │ 3. Create checkout_session    │                     │                               │
      │                               │    status = 'pending'         │                     │                               │
      │                               ├────────────────────────────────────────────────────────────────────────────────────>│
      │                               │ 4. Call Provider API          │                     │                               │
      │                               │    createTransaction()        │                     │                               │
      │                               ├──────────────────────────────>│                     │                               │
      │                               │ 5. Return payment URL / Snap  │                     │                               │
      │                               │<──────────────────────────────┤                     │                               │
      │ 6. Return Snap Token / URL    │                               │                     │                               │
      │<──────────────────────────────┤                               │                     │                               │
      │                                                               │                     │                               │
      │ 7. Customer pays via QRIS / Virtual Account / Credit Card     │                     │                               │
      ├──────────────────────────────────────────────────────────────>│                     │                               │
      │                                                               │                     │                               │
      │                                                               │ 8. HTTP POST Webhook callback                       │
      │                                                               │    (order_id, status, signature_key)                │
      │                                                               ├────────────────────>│                               │
      │                                                               │                     │ 9. Verify SHA-512 Signature   │
      │                                                               │                     │    hash(order_id+status+gross)│
      │                                                               │                     │                               │
      │                                                               │                     │ 10. Check event idempotency   │
      │                                                               │                     ├──────────────────────────────>│
      │                                                               │                     │     (Insert payment_webhooks  │
      │                                                               │                     │      ON CONFLICT DO NOTHING)  │
      │                                                               │                     │<──────────────────────────────┤
      │                                                               │                     │                               │
      │                                                               │                     │ 11. Atomic State Transition:  │
      │                                                               │                     │     - payment_transactions    │
      │                                                               │                     │       status = 'settled'      │
      │                                                               │                     │     - subscriptions           │
      │                                                               │                     │       status = 'active'       │
      │                                                               │                     │     - create invoice record   │
      │                                                               │                     │     - grant entitlements      │
      │                                                               │                     ├──────────────────────────────>│
      │                                                               │ 12. HTTP 200 OK     │                               │
      │                                                               │<────────────────────┤                               │
```

---

## 4. Dedicated Environment Provisioning State Machine

Dedicated environments transition through a strictly auditable state machine with automated health checks.

```
+---------------+     Validate Entitlement     +---------------+     DevOps / Policy     +---------------+
|   REQUESTED   | ───────────────────────────> |  VALIDATING   | ──────────────────────> |   APPROVED    |
+---------------+                              +---------------+                         +---------------+
        │                                              │                                         │
        │ Failed Validation                            │ Failed Check                            │
        ▼                                              ▼                                         v
+---------------+                              +---------------+                         +---------------+
| PROVISIONING_ |                              | PROVISIONING_ |                         | PROVISIONING  |
|    FAILED     |                              |    FAILED     |                         +---------------+
+---------------+                              +---------------+                                 │
        ▲                                              ▲                                         │ Spawn Container / VPS
        │                                              │                                         ▼
        │                                              │ Provisioning Error              +---------------+
        │                                              └──────────────────────────────── |  CONFIGURING  |
        │                                                                                +---------------+
        │                                                                                        │
        │                                                                                        │ Ingress & Routing Setup
        │                                                                                        ▼
        │                              3 Failed Probes                                   +---------------+
        └─────────────────────────────────────────────────────────────────────────────── | HEALTH_CHECK  |
                                                                                         +---------------+
                                                                                                 │
                                                                                                 │ 3 Passing Probes
                                                                                                 ▼
+---------------+     Customer Request / Expiry     +---------------+     Confirmed Deprovision  +---------------+
|  DEPROVISIONED| <──────────────────────────────── | DEPROVISIONING| <───────────────────────── |    ACTIVE     |
+---------------+                                   +---------------+                            +---------------+
```

---

## 5. Dual Rolling Quota Recovery Engine Flow

This data flow executes continuously in memory and is backed by periodic database checkpoints:

1. **Standard Request Quota (5-Hour Rolling Window):**
   - Each request executed generates a timestamped token event.
   - When calculating capacity at timestamp $T$:
     $$\text{UsedRequests}(T) = \sum_{r \in \text{records}} [ (T - r.\text{createdAt}) < 18{,}000{,}000\text{ ms} ]$$
   - Oldest request $r_{\text{oldest}}$ inside the 5-hour window restores capacity at $r_{\text{oldest}}.\text{createdAt} + 5\text{ hours}$.
2. **Frontier Model Token Cap (24-Hour and 7-Day Rolling Windows):**
   - High-tier reasoning models (Claude 3.7 Sonnet, GPT-4o) meter total tokens:
     $$\text{DailyTokens}(T) = \sum_{r \in \text{token\_records}} r.\text{tokens} \quad \text{where } (T - r.\text{createdAt}) < 86{,}400{,}000\text{ ms}$$
     $$\text{WeeklyTokens}(T) = \sum_{r \in \text{token\_records}} r.\text{tokens} \quad \text{where } (T - r.\text{createdAt}) < 604{,}800{,}000\text{ ms}$$
3. **Recovery Notification:**
   - When a tenant reaches 90% or 100% of rolling capacity, edge router responds with `429 Too Many Requests` containing header `X-Morvexa-Slot-Restores-In: <formatted_time>` without crashing downstream clients.
