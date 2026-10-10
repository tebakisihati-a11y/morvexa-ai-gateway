# Morvexa Nexus — System Architecture Specification

**Document:** `docs/architecture/SYSTEM_ARCHITECTURE.md`  
**Date:** 2026-10-10  
**Status:** Approved Architectural Baseline (Phase 1)  
**Author:** Morvexa Nexus Principal Software Architecture Team  
**Scope:** Control Plane, Edge Data Plane, Service Boundaries, Trust Zones, High Availability & Failover  

---

## 1. Architectural Philosophy & Principles

MORVEXA NEXUS is architected around four core engineering principles:

1. **Prinsip Ponytail (Tangga Minimal):** Avoid speculative infrastructure. We use a **Modular Monolith** deployed to Vercel Serverless and Edge runtimes, backed by Supabase PostgreSQL. No premature Kubernetes, microservice meshes, or distributed message buses are introduced until query volumes or physical compute constraints justify them.
2. **Dual-Plane Decoupling:**
   - **Control Plane:** Operates asynchronously or on-demand to manage identity, organization hierarchy, billing lifecycles, catalog configurations, API credentials, and infrastructure provisioning.
   - **Data Plane (Edge AI Gateway):** Operates on the latency-critical path. It must execute model routing, token rate-limiting, and response streaming with sub-50ms gateway overhead. The Data Plane must never perform synchronous multi-table relational joins or block on external control plane dependencies during streaming.
3. **Defense-in-Depth & Zero Trust:** Tenant boundaries are enforced in code, in middleware, and decisively at the database engine level using PostgreSQL Row Level Security (RLS). No client-submitted role, price, usage amount, or organization identifier is trusted without cryptographic server-side validation.
4. **Resilience & Offline Fault Tolerance:**
   - A transient control plane database outage must not disrupt active AI request proxying for verified credentials.
   - A payment provider webhook delay must not corrupt subscription state.
   - Failed dedicated provisioning jobs must fail into safe, auditable states with automated compensating actions.

---

## 2. High-Level C4 Architecture

### Level 1: System Context Diagram

```
                                  +---------------------------------------+
                                  |            External Clients           |
                                  | - Web App Users (Customer Portal)     |
                                  | - Platform Operators (Nexus Console)  |
                                  | - External AI Clients (SDKs / APIs)   |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTPS
                                                      v
                                  +---------------------------------------+
                                  |             MORVEXA NEXUS             |
                                  |        Unified Control Plane &        |
                                  |           Edge AI Gateway             |
                                  +---------+-------------------+---------+
                                            |                   |
                        +-------------------+                   +-------------------+
                        |                                                           |
                        v                                                           v
+-----------------------------------------------+           +-----------------------------------------------+
|             Upstream AI Providers             |           |          External Payment & Services          |
| - Anthropic Claude (Messages API)             |           | - Indonesian Payment Gateway (Midtrans/Xendit)|
| - OpenAI / GPT-4o (Chat Completions)          |           | - Stripe (International USD Adapter)          |
| - Google Gemini 2.0 (Gemini API)              |           | - Dedicated VPS / Docker / Cloud Run Hosts    |
| - Groq LPU & DeepSeek V3                      |           | - Transactional Email (Resend / SMTP)         |
| - Private Local Model (localhost:5002)        |           |                                               |
+-----------------------------------------------+           +-----------------------------------------------+
```

---

### Level 2: Container & Modular Boundary Diagram

Inside the Next.js 15 Monolith, modules are partitioned into strict logical service boundaries:

```
+---------------------------------------------------------------------------------------------------------+
|                                      MORVEXA NEXUS RUNTIME CONTAINER                                    |
|                                                                                                         |
|  +-------------------------------------------------+   +---------------------------------------------+  |
|  |           PRESENTATION LAYER (UI)               |   |          EDGE API GATEWAY (DATA PLANE)      |  |
|  |                                                 |   |                                             |  |
|  | [Public Website] (morvexa.app / vercel.app)     |   | [Hono.js Edge Router] (/api/v1/*)           |  |
|  | - Landing Page, Features, Pricing Calculator    |   | - Anthropic Protocol (/v1/messages)         |  |
|  |                                                 |   | - OpenAI Protocol (/v1/chat/completions)    |  |
|  | [Customer Self-Service Portal] (/portal)        |   | - Edge Rate Limiter (Token Bucket)          |  |
|  | - Org Management, Member Invites, API Keys      |   | - Token Hash Cache (SHA-256 LRU Cache)      |  |
|  | - Subscription Upgrade, Invoices, Usage Charts  |   | - Rolling Quota Evaluator (5h/24h/7d)       |  |
|  | - Interactive Playground & Live Traces          |   | - Zero-Buffer SSE Stream Engine             |  |
|  |                                                 |   | - Intelligent Failover Routing Mesh         |  |
|  | [Nexus Admin Command Center] (/nexus)           |   | - PII Sanitizer & Semantic Prompt Cache     |  |
|  | - Executive Revenue & MRR Overview              |   +----------------------+----------------------+  |
|  | - Tenant Accounts & Suspension Control          |                          |                         |
|  | - Catalog Editor & Price Versioning             |                          | Async Telemetry Push    |
|  | - Transaction Ledger & Reconciliation Inspector |                          v                         |
|  | - Infrastructure Operations & Dedicated Monitor |   +---------------------------------------------+  |
|  | - Audit Trail & Security Incident Log          |   |          CORE DOMAIN SERVICES LAYER         |  |
|  +------------------------+------------------------+   |                                             |  |
|                           |                            | [Identity & Access Service]                 |  |
|                           | Server Actions / Trpc      | - Supabase Auth SSR, Cookie Management      |  |
|                           v                            | - 9-Tier Hierarchical RBAC Evaluator        |  |
|  +-------------------------------------------------+   |                                             |  |
|  |           CORE DOMAIN SERVICES LAYER            |   | [Billing & Subscription Engine]             |  |
|  |                                                 |   | - Subscription State Machine                |  |
|  | [Entitlement & Quota Service]                   |   | - Invoice & Receipt Generator               |  |
|  | - Evaluates active plan features & limits       |   | - Payment Gateway Adapter (Midtrans/Xendit) |  |
|  | - Reconciles usage aggregates with quotas       |   | - Idempotent Webhook Processor              |  |
|  |                                                 |   |                                             |  |
|  | [Infrastructure Provisioning Service]           |   | [Usage Metering & Cost Ledger]              |  |
|  | - State Machine: REQUESTED -> ACTIVE            |   | - Real-time Token Ingestion Ledger          |  |
|  | - Adapter: Shared Proxy vs Dedicated VPS/Node   |   | - Cost Calculation by Model Version         |  |
|  | - Automated Health Check Probes                 |   |                                             |  |
|  |                                                 |   | [Observability & Audit Service]             |  |
|  | [Notification & Background Worker Service]      |   | - Append-only Structured Audit Logger       |  |
|  | - Webhook retry scheduler, renewal alerts       |   | - Telemetry Trace Aggregator                |  |
|  +-------------------------------------------------+   +----------------------+----------------------+  |
|                                                                               |                         |
+-------------------------------------------------------------------------------|-------------------------+
                                                                                | SQL over SSL (pgBouncer)
                                                                                v
+---------------------------------------------------------------------------------------------------------+
|                                       SUPABASE POSTGRESQL (STORAGE TIER)                                |
|  - Tenancy: organizations, profiles, organization_members, invitations                                  |
|  - Subscriptions: plans, plan_versions, subscriptions, subscription_entitlements                        |
|  - Financial: payment_customers, checkout_sessions, payment_transactions, invoices, webhooks, ledger    |
|  - Gateway: api_keys, upstream_credentials, rolling_quota_records, request_logs, usage_aggregates       |
|  - Infrastructure: infrastructure_environments, provisioning_jobs, health_check_events                  |
|  - Operations: audit_logs, notification_jobs, feature_flags, system_configuration                       |
|  - Security: Row Level Security (RLS) enabled with multi-tenant org_id isolation on all exposed tables  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Trust Boundaries & Security Zones

The architecture defines four distinct Trust Zones:

```
[ ZONE 0: Untrusted Public Internet ]
    │
    │ HTTPS (TLS 1.3)
    ▼
[ ZONE 1: Edge Ingress & Gateway Demilitarized Zone (DMZ) ]
    │ - Vercel Edge / Hono.js Router
    │ - Header sanitization, IP extraction, WAF rules
    │ - Bearer Token SHA-256 validation (instant rejection of invalid/revoked keys)
    │ - In-memory rate limiting (DDoS & resource exhaustion shield)
    │
    │ Internal Trusted Context (Edge -> Application Boundary)
    ▼
[ ZONE 2: Application Control Plane (Trusted) ]
    │ - Next.js Server Components, Server Actions, Domain Services
    │ - Authenticated Supabase Auth SSR session context
    │ - RBAC authorization checks (verifying role hierarchy)
    │ - Payment webhook cryptographic signature verification (SHA-512)
    │ - Sensitive secrets management (Upstream provider keys encrypted with AES-256-GCM)
    │
    │ Authenticated Database Connection (SSL with RLS)
    ▼
[ ZONE 3: Persistence Tier (Authoritative Source of Truth) ]
    │ - PostgreSQL tables protected by Row Level Security
    │ - Strict tenant isolation: Every query scoped to `org_id IN (SELECT org_id FROM profiles)`
    │ - Immutable financial ledgers and append-only audit trails
```

---

## 4. Failure Modes, Redundancy & Graceful Degradation

| Failure Scenario | Impact | System Reaction & Recovery Strategy |
|---|---|---|
| **Primary AI Provider Outage (e.g. Anthropic 503/429)** | Streaming fails on primary model | **Intelligent Failover:** `resolveProviderRoute` detects upstream error code and triggers next hop in priority chain (Anthropic ➔ DeepSeek V3 ➔ Groq ➔ Gemini) within 200ms. Response headers inject `X-Morvexa-Failover: true`. |
| **Control Plane Database Maintenance** | Next.js admin dashboard cannot query live records | **Data Plane Independence:** The edge AI gateway continues proxying requests for cached API keys using in-memory LRU cache (TTL 60–300s). Usage events are queued or buffered in memory and flushed once DB recovers. |
| **Payment Gateway Webhook Delayed / Dropped** | Customer completes bank transfer/QRIS, but webhook not received immediately | **Reconciliation Polling:** Scheduled background job polls payment provider API (`retrievePaymentStatus`) for any `pending` transaction older than 5 minutes. Detects settlement and triggers idempotent activation. |
| **Duplicate Webhook Delivery** | Payment provider retries webhook 5 times | **Idempotent Webhook Engine:** Ingests into `payment_webhook_events` with unique constraint on `(provider, event_id)`. Subsequent duplicate events return immediate HTTP 200 without re-crediting or re-activating subscriptions. |
| **Dedicated Environment Node Failure** | Enterprise customer dedicated VPS or container crashes | **Health Check Probe:** Automated health worker detects 3 consecutive failed probes (`HEALTH_CHECK_FAILED`), flags environment in Nexus console, triggers DevOps alert, and routes traffic temporarily to shared fallback proxy if permitted. |
| **Upstream Provider Rate Limit Exhaustion** | Gateway keys hit global RPM cap | **Graceful Throttling:** Gateway returns HTTP 429 with standard `Retry-After` header. If multi-provider fallback is enabled, routes to secondary provider without failing customer request. |

---

## 5. Caching & Performance Architecture

To achieve sub-50ms gateway latency while preserving strict tenant quota guarantees:

1. **API Key Cache:**
   - Hashed keys (`SHA-256`) and their associated metadata (`org_id`, `rate_limit_rpm`, `daily_token_limit`, `tier`) are cached in an edge-compatible LRU cache with a 60-second TTL.
   - When an API key is revoked in the control plane, a cache eviction event is dispatched.
2. **Quota Reservation & Buffer:**
   - Standard requests: Verified against 5-hour rolling count in memory with periodic PostgreSQL reconciliation.
   - High-volume token streams: Emits usage records asynchronously upon stream completion to prevent write latency from delaying SSE chunks.
3. **Semantic Prompt Caching (Optional Guardrail):**
   - Exact hash of prompt system + messages checked against fast cache. If identical inference exists within cache TTL, returns cached response with `cached: true` header, reducing upstream cost to $0.
