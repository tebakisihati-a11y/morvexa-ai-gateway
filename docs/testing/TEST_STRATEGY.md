# Morvexa Nexus — Quality Assurance & Testing Strategy

**Document:** `docs/testing/TEST_STRATEGY.md`  
**Date:** 2026-10-10  
**Status:** Approved Testing Strategy (Phase 1)  
**Author:** QA Automation & Reliability Engineering Team  
**Tooling:** Vitest (Unit/Integration), Supertest / Node Fetch, Playwright (E2E)  

---

## 1. Testing Pyramid & Verification Matrix

MORVEXA NEXUS testing is structured into six complementary layers:

```
                  ▲
                 / \
                /   \     E2E Lifecycle Tests (Playwright)
               / E2E \    - User Registration ➔ Checkout ➔ AI Inference ➔ Invoicing
              /───────\
             / Security\  Security & Isolation Tests (Vitest)
            /   Tests   \ - Cross-Tenant RLS, Signature Forgery, Privilege Escalation
           /─────────────\
          /  Integration  \ Integration & Persistence Tests (Vitest + Supabase Test DB)
         /      Tests      \ - Webhook Handlers, DB Repositories, Upstream Forwarding
        /───────────────────\
       /      Unit Tests     \ Unit Tests (Vitest - In Memory, Fast <2s)
      /                       \ - Quota Math, State Machines, Signature Verifiers, RBAC
     /─────────────────────────\
```

---

## 2. Test Suite Specifications by Layer

### Layer A: Unit Tests (Fast In-Memory Execution)
- **Quota Engine Math:** Validate 5-hour rolling request counts, 24-hour and 7-day token accumulation, and live countdown restoration times ([quota.test.ts](file:///Users/user/Library/Mobile%20Documents/com~apple~CloudDocs/Morvexa%20Master%20Sistem%20/tests/quota.test.ts)).
- **Payment State Machine:** Unit test valid status transitions (`PENDING` ➔ `SETTLED`; `SETTLED` ➔ `REFUNDED`) and reject illegal transitions (`SETTLED` ➔ `PENDING`).
- **Signature Verification:** Test Midtrans SHA-512 and Xendit token verification against known valid and tampered vectors.
- **RBAC Role Matrix:** Test permission evaluator against all 9 roles to ensure unauthorized roles return `false`.
- **Key Generation:** Verify generated keys conform to regex `^mvx_(live|test)_[a-zA-Z0-9]{32}$` with valid SHA-256 digests.

### Layer B: Integration Tests (Service & Persistence Layer)
- **Payment Gateway Webhook Handling:**
  - Ingest valid test webhook payload: verifies HTTP 200, updates transaction, activates subscription.
  - Ingest invalid signature webhook: verifies HTTP 401, transaction remains pending.
  - Ingest duplicate webhook: verifies idempotency check returns HTTP 200 without duplicate billing.
- **API Key Lifecycle & Caching:**
  - Create API key ➔ hash saved in database ➔ request to `/api/v1/messages` succeeds.
  - Revoke API key (`is_active = false`) ➔ cache invalidated ➔ subsequent request receives 401 within 5 seconds.
- **Asynchronous Telemetry Ingestion:**
  - Mock streaming AI response ➔ verify record written to `request_logs` with accurate prompt/completion tokens.

### Layer C: Security & Multi-Tenant Isolation Tests
- **Cross-Tenant RLS Verification:**
  - Authenticate as User A (Org A) ➔ attempt `SELECT * FROM api_keys WHERE org_id = 'org_b'`. Verify 0 rows returned.
  - Attempt `UPDATE organizations SET tier = 'enterprise' WHERE id = 'org_a'` without `SUPER_ADMIN` role. Verify 403 Forbidden.
- **Price Tampering Protection:**
  - Submit checkout payload with modified `amount: 100`. Verify backend rejects or overwrites with authoritative price from `plan_versions`.
- **Secret Leakage Audit:**
  - Automated regex scan on build outputs (`.next/`) to confirm no secret environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, etc.) are bundled into client assets.

### Layer D: End-to-End (E2E) Flow Tests
- **Full Customer Acquisition Lifecycle:**
  1. Register new user account via Supabase Auth.
  2. Create organization "Acme Labs".
  3. Select "Pro Plan" and initiate checkout session.
  4. Simulate mock Midtrans payment settlement webhook.
  5. Verify subscription is active and entitlements are granted.
  6. Generate production API key (`mvx_live_...`).
  7. Send authorized inference request to `/api/v1/messages`.
  8. Verify response streaming works and usage is logged.
  9. Inspect generated invoice in customer portal.

### Layer E: Reliability & Fault Tolerance Tests
- **Provider Failover Simulation:**
  - Configure simulated 429 rate-limit on primary provider (Anthropic).
  - Verify gateway automatically fails over to secondary provider (DeepSeek / Groq) without returning 500 to client.
- **Database Cold Start Resilience:**
  - Verify edge gateway serves cached API keys even during simulated database query timeouts.

### Layer F: Performance & Concurrency Tests
- **Concurrent Quota Reservation:**
  - Dispatch 50 simultaneous requests from an account with only 5 remaining quota slots.
  - Verify exactly 5 requests succeed and 45 requests receive 429 Too Many Requests (zero over-subscription).
