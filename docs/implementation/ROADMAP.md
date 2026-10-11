# Morvexa Nexus — Phased Implementation Roadmap

**Document:** `docs/implementation/ROADMAP.md`  
**Date:** 2026-10-10  
**Status:** Approved (Phase 0 Audit Deliverable)  
**Author:** Morvexa Nexus Principal Engineering Team  
**Execution Strategy:** Sequential, Verified, Zero-Regression Incremental Delivery  

---

## 1. Roadmap Overview & Phasing Principles

MORVEXA NEXUS will be engineered in nine strictly gated phases. In accordance with the **Tangga Minimal** (Ponytail Principle) and non-negotiable engineering rules:
- No phase begins until the preceding phase's verification criteria, tests, and security reviews pass.
- Existing functionality on the public website and edge gateway (`https://morvexa-sistem.vercel.app/`) must continue operating without breaking changes.
- Every implemented capability must have a concrete data model, server-side authorization check, backend implementation, and automated test.

```
+---------------------------------------------------------------------------------------+
|  PHASE 0: Audit & Baseline (CURRENT - COMPLETED)                                      |
|  - System & security audit, live production verification, ADRs, initial roadmap       |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 1: Architecture & Technical Design                                              |
|  - Comprehensive database schema DDL, API contracts, domain boundaries                |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 2: Identity, Organizations & RBAC                                              |
|  - Supabase Auth SSR, 9-tier RBAC, complete RLS policies, secure key generator        |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 3: Subscriptions, Billing & Payment Gateway                                    |
|  - Indonesian payment adapter (Midtrans/Xendit), webhook signatures, invoices, ledger |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 4: AI Gateway & Usage Metering                                                 |
|  - Cryptographic key verification, edge rate limiting, atomic quota, usage logging    |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 5: Hybrid Shared / Dedicated Infrastructure                                    |
|  - Provisioning state machine, dedicated environment adapter, health check monitoring |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 6: Admin Nexus & Customer Self-Service Portals                                 |
|  - Nexus Command Center, Customer Portal, metrics visualization, invoice download     |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 7: Automation, Observability & Security Hardening                             |
|  - Cron jobs, email notifications, audit logs, CORS tightening, OWASP ASVS compliance |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  PHASE 8: Integration, Load Testing & Release Readiness                               |
|  - Sandbox E2E tests, concurrency verification, runbooks, production checklist        |
+---------------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Plan & Deliverables

### PHASE 0 — AUDIT AND BASELINE [CURRENT — COMPLETE]
- **Goal:** Establish ground truth of the codebase, live deployment, database, and vulnerabilities.
- **Deliverables:**
  - `docs/audit/INITIAL_AUDIT.md`
  - `docs/audit/EXISTING_ARCHITECTURE.md`
  - `docs/audit/SECURITY_FINDINGS.md`
  - `docs/architecture/ADR_LOG.md`
  - `docs/implementation/ROADMAP.md`
- **Verification:** Unit tests pass (7/7), TypeScript passes (0 errors), live site inspected and audited.

---

### PHASE 1 — ARCHITECTURE AND TECHNICAL DESIGN
- **Goal:** Author exhaustive technical specifications, DDL migration plans, and API contracts before writing business logic.
- **Key Tasks:**
  1. Author `docs/architecture/SYSTEM_ARCHITECTURE.md` with complete boundary specifications.
  2. Author `docs/database/SCHEMA.md` with full relational schemas for Billing, Tenancy, Infrastructure, and Audit.
  3. Author `docs/api/API_CONTRACTS.md` with OpenAPI/TypeScript request and response schemas.
  4. Author `docs/database/MIGRATION_PLAN.md` with backwards-compatible migration steps.
- **Acceptance Criteria:**
  - Data models cover all 24 required logical entities without orphaned foreign keys.
  - API schemas include pagination, correlation IDs, and standard error envelopes.

---

### PHASE 2 — IDENTITY, ORGANIZATIONS AND RBAC
- **Goal:** Implement secure authentication, organization multi-tenancy, and server-side RBAC.
- **Key Tasks:**
  1. Set up Supabase Auth SSR cookies (`@supabase/ssr`) with Next.js middleware.
  2. Create migration for `organizations`, `organization_members`, `roles`, and `invitations`.
  3. Author comprehensive PostgreSQL RLS policies for tenant data isolation.
  4. Implement registration, login, logout, password reset, and organization creation flows.
  5. Implement role-checking helpers enforcing all 9 roles (`PLATFORM_OWNER` down to `PUBLIC_USER`).
  6. Refactor API key creation to use cryptographically secure random values and SHA-256 hashes.
- **Acceptance Criteria:**
  - Automated tests verify cross-tenant read/write attempts are strictly blocked by RLS.
  - Privileged actions reject non-admin users with 403 Forbidden.

---

### PHASE 3 — SUBSCRIPTIONS, BILLING AND PAYMENT
- **Goal:** Build automated payment processing, subscription lifecycles, and financial records.
- **Key Tasks:**
  1. Create schema for `plans`, `subscriptions`, `payment_transactions`, `invoices`, and `payment_webhook_events`.
  2. Implement `PaymentGatewayAdapter` interface with primary adapter for Indonesian payments (Midtrans Snap / Xendit Invoice).
  3. Implement checkout session creation endpoint with server-authoritative prices (IDR / USD).
  4. Build webhook ingestion route (`/api/billing/webhooks/:provider`) with SHA-512 signature verification.
  5. Implement idempotent transaction processing and atomic state transition machine.
  6. Generate downloadable/printable invoice representations.
- **Acceptance Criteria:**
  - Webhooks with invalid signatures return 401/400 and trigger no state changes.
  - Duplicate webhook deliveries do not create duplicate transactions or entitlements.
  - Browser redirects never trigger subscription activation.

---

### PHASE 4 — API GATEWAY AND USAGE METERING
- **Goal:** Harden the edge proxy with cryptographic key verification, rate limiting, and real-time metering.
- **Key Tasks:**
  1. Replace prefix-only key check in `auth.ts` with SHA-256 database lookup and memory caching.
  2. Implement sliding-window rate limiting per API key and organization.
  3. Integrate the Dual Rolling Quota engine (`quota.ts`) into the live request pipeline.
  4. Asynchronously persist every gateway request into `request_logs` with latency, TTFT, model, and tokens.
  5. Record token and request consumption in `rolling_quota_records` and `usage_aggregates`.
  6. Implement PII data sanitization on prompt payloads prior to upstream dispatch.
- **Acceptance Criteria:**
  - Revoked keys (`is_active = false`) are rejected with 401 Unauthorized within 5 seconds of revocation.
  - Requests exceeding quota are blocked with 429 Too Many Requests before reaching upstream AI APIs.

---

### PHASE 5 — HYBRID SHARED/DEDICATED INFRASTRUCTURE
- **Goal:** Implement the infrastructure management layer supporting Shared and Dedicated modes.
- **Key Tasks:**
  1. Create schema for `infrastructure_environments`, `provisioning_jobs`, and `health_check_events`.
  2. Implement provisioning state machine (`REQUESTED` -> `VALIDATING` -> `APPROVED` -> `PROVISIONING` -> `CONFIGURING` -> `HEALTH_CHECK` -> `ACTIVE`).
  3. Create `InfrastructureProviderAdapter` supporting Shared proxy routing and Dedicated instances (e.g. Docker / VPS / Local daemon at `localhost:5002`).
  4. Implement automated health check worker to verify latency and uptime of dedicated nodes.
  5. Build deprovisioning and suspension workflows.
- **Acceptance Criteria:**
  - Dedicated provisioning can only be initiated by authorized `CUSTOMER_OWNER` or `DEVOPS_ADMIN`.
  - Failed provisioning transitions to `PROVISIONING_FAILED` without hanging indefinitely.

---

### PHASE 6 — ADMIN AND CUSTOMER DASHBOARDS
- **Goal:** Deliver production-grade UI consoles for administrators and customers matching Morvexa's high-density aesthetic.
- **Key Tasks:**
  1. Build **Morvexa Nexus Admin Console** (`/nexus`):
     - Executive overview (MRR, active orgs, total transactions, gateway traffic, margin).
     - Customer & organization manager (profiles, tier override, suspension).
     - Plan management & pricing editor.
     - Transaction ledger, reconciliation inspector, and refund manager.
     - Infrastructure operations & dedicated instance monitor.
  2. Build **Customer Self-Service Portal** (`/portal`):
     - API key creation, rotation, and revocation modal with one-time secret view.
     - Real-time rolling quota meter and usage charts.
     - Subscription status, plan upgrade/downgrade, and checkout modal.
     - Invoice history and PDF download.
     - Interactive playground and trace inspector.
- **Acceptance Criteria:**
  - Strict server-side route guards prevent customer access to `/nexus`.
  - UI maintains monospace typography, zero AI slop, and full mobile responsiveness.

---

### PHASE 7 — AUTOMATION, OBSERVABILITY AND SECURITY HARDENING
- **Goal:** Implement background automation, structured observability, and enterprise security controls.
- **Key Tasks:**
  1. Set up scheduled background jobs (e.g., Vercel Cron or Edge Workers) for:
     - Subscription renewal and expiration checks.
     - Webhook reconciliation and retry dispatch.
     - Rolling quota slot restoration and token usage rollups.
  2. Implement transactional email notifications for payment receipts, renewal reminders, and quota threshold alerts.
  3. Implement append-only `audit_logs` table tracking all administrative actions.
  4. Tighten CORS headers in `vercel.json` and enforce CSRF tokens on mutating operations.
  5. Conduct full OWASP ASVS checklist audit.
- **Acceptance Criteria:**
  - Zero high or critical vulnerabilities remain unresolved.
  - Automated jobs handle retries with bounded exponential backoff.

---

### PHASE 8 — INTEGRATION, LOAD TESTING AND RELEASE READINESS
- **Goal:** Validate end-to-end reliability under load, document operational runbooks, and prepare for production release.
- **Key Tasks:**
  1. Execute complete E2E test suite simulating new user registration -> organization setup -> checkout -> webhook -> key creation -> AI gateway request -> usage metering -> invoice generation.
  2. Perform load testing on the gateway endpoint to verify rate-limit enforcement and connection stability.
  3. Author `docs/operations/RUNBOOKS.md` for payment webhook outages, gateway upstream failover, and disaster recovery.
  4. Update `README.md` and complete documentation index.
- **Acceptance Criteria:**
  - All automated unit, integration, and security tests pass.
  - Production build (`npm run build`) compiles cleanly without warnings.
  - Live staging verification succeeds.

---

## 3. Progress Tracking & Checkpoint Gate

| Phase | Description | Status | Gate Approval Date |
|---|---|---|---|
| **Phase 0** | Repository & Production System Audit | **COMPLETED** | 2026-10-10 |
| **Phase 1** | Architecture & Technical Design | **COMPLETED** | 2026-10-10 |
| **Phase 2** | Identity, Organizations & RBAC | **COMPLETED** | 2026-10-10 |
| **Phase 3** | Subscriptions, Billing & Payments | **COMPLETED** | 2026-10-10 |
| **Phase 4** | AI Gateway & Usage Metering | **COMPLETED** | 2026-10-10 |
| **Phase 5** | Hybrid Infrastructure Management | **COMPLETED** | 2026-10-10 |
| **Phase 6** | Admin Nexus & Customer Dashboards | **COMPLETED** | 2026-10-10 |
| **Phase 7** | Automation, Observability & Security | **COMPLETED** | 2026-10-11 |
| **Phase 8** | Integration & Release Readiness | **COMPLETED** | 2026-10-11 |

