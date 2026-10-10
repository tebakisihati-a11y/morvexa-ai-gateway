# Morvexa Platform — Security & Data Integrity Audit Findings

**Document:** `docs/audit/SECURITY_FINDINGS.md`  
**Date:** 2026-10-10  
**Status:** Complete (Phase 0 Audit Deliverable)  
**Author:** SaaS Multi-Tenant Security & Infrastructure Engineering Team  
**Standard Referenced:** OWASP Top 10 API Security, OWASP ASVS v4.0, NIST SP 800-63B  

---

## 1. Executive Summary of Security Posture

An exhaustive security audit was performed across the Morvexa codebase, local test suites, database migrations, and the live production endpoint (`https://morvexa-sistem.vercel.app/`).

While the application code demonstrates good clean code structure and low dependency overhead, the current implementation is in a **prototype state** with critical security bypasses that must be resolved prior to handling real customer accounts, financial transactions, or production API traffic.

### Summary of Vulnerabilities by Severity:
- 🔴 **Critical Severity:** 2
- 🟠 **High Severity:** 3
- 🟡 **Medium Severity:** 3
- 🔵 **Low / Informational:** 2

---

## 2. Detailed Vulnerability Findings

### FINDING SEC-01: Gateway API Key Verification Bypass
- **Severity:** 🔴 **CRITICAL**
- **CWE:** CWE-287 (Improper Authentication), CWE-306 (Missing Authentication for Critical Function)
- **OWASP API:** API2:2023 Broken Authentication
- **Affected File:** `src/lib/gateway/auth.ts` (Lines 18–25)
- **Live Verification Evidence:**
  Executing `curl -X POST https://morvexa-sistem.vercel.app/api/v1/messages -H "Authorization: Bearer mvx_live_arbitrary_string"` returned **HTTP 200** and generated responses.
- **Root Cause:**
  ```typescript
  const token = parts[1];
  if (!token.startsWith("mvx_live_") && !token.startsWith("mvx_test_")) {
    return { valid: false, error: "Invalid Morvexa API Key format..." };
  }
  return { valid: true, keyPrefix: token.substring(0, 14) };
  ```
  The logic tests only string prefix conformance. It performs zero database lookup, zero cryptographic verification against `api_keys.key_hash`, and never checks whether the key is active or revoked (`is_active = false`).
- **Impact:** Any unauthorized party can consume AI gateway resources, trigger upstream model costs, or deplete organizational quotas simply by passing any token starting with `mvx_live_`.
- **Remediation Plan (Phase 4):**
  1. Hash incoming tokens with `SHA-256`.
  2. Query `api_keys` by `key_hash` with `is_active = true`.
  3. Load associated `org_id`, rate limits, and subscription tier.
  4. Cache validated key hashes in an in-memory LRU cache or Redis for sub-5ms lookup latency with defined TTL.

---

### FINDING SEC-02: Row Level Security Enabled with Zero Tenant Policies
- **Severity:** 🔴 **CRITICAL**
- **CWE:** CWE-284 (Improper Access Control)
- **OWASP API:** API1:2023 Broken Object Level Authorization (BOLA)
- **Affected File:** `supabase/migrations/20261008_init.sql` (Lines 91–98)
- **Description:**
  The initial migration executes:
  ```sql
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE upstream_credentials ENABLE ROW LEVEL SECURITY;
  ALTER TABLE rolling_quota_records ENABLE ROW LEVEL SECURITY;
  ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
  ```
  However, **no `CREATE POLICY` statements exist in the file**.
- **Impact:**
  - When accessed using Supabase `anon` or authenticated user tokens, all queries to these tables will be rejected with an RLS error because default posture denies all access.
  - If code uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS, all tenant boundaries are removed, creating cross-tenant data leakage risks if application code omits `where org_id = ...`.
- **Remediation Plan (Phase 2):**
  Implement comprehensive RLS policies based on `auth.uid()` and verified organization membership:
  ```sql
  CREATE POLICY "Users can access their own org data"
  ON api_keys FOR ALL
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));
  ```

---

### FINDING SEC-03: Completely Unauthenticated Dashboard Console
- **Severity:** 🟠 **HIGH**
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **OWASP API:** API5:2023 Broken Function Level Authorization
- **Affected File:** `src/app/page.tsx`
- **Description:**
  The frontend console at `https://morvexa-sistem.vercel.app/` renders immediately upon visiting the root URL. There is no login requirement, session gate, or role check. Anyone who navigates to the domain can view all tabs (Keys, Traces, Guardrails, Routing).
- **Impact:** Unrestricted access to system configuration and operational views.
- **Remediation Plan (Phase 2 & Phase 6):**
  1. Implement Next.js middleware with Supabase SSR session validation.
  2. Establish `/login` and `/register` customer routes.
  3. Separate public customer website, `/portal` (customer self-service), and `/nexus` (admin control plane).

---

### FINDING SEC-04: Insecure Key Generation and Mock Hashes
- **Severity:** 🟠 **HIGH**
- **CWE:** CWE-330 (Use of Insufficiently Random Values), CWE-328 (Use of Weak Hash)
- **OWASP API:** API2:2023 Broken Authentication
- **Affected File:** `src/lib/supabase/store.ts` (Lines 158–178)
- **Description:**
  ```typescript
  const randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const rawSecret = `mvx_live_${randomSuffix}`;
  const maskedKey = `mvx_live_...${randomSuffix.slice(-4)}`;
  const hash = `sha256_${randomSuffix}`;
  ```
  `Math.random()` is not cryptographically secure and predictable. The hash is literally string concatenation, not a SHA-256 digest.
- **Impact:** Generated keys are susceptible to brute-force predictability, and stored keys are not securely hashed.
- **Remediation Plan (Phase 2):**
  Use `crypto.getRandomValues(new Uint8Array(24))` (or `node:crypto.randomBytes`) for key generation and `crypto.subtle.digest("SHA-256", ...)` for authoritative hashing.

---

### FINDING SEC-05: Missing Concurrency Control and Rate Limiting
- **Severity:** 🟠 **HIGH**
- **CWE:** CWE-799 (Improper Control of Generation of Frequent Requests)
- **OWASP API:** API4:2023 Unrestricted Resource Consumption
- **Affected Files:** `src/lib/gateway/app.ts`, `src/lib/quota.ts`
- **Description:**
  The gateway currently enforces no rate limiting on the edge. While `api_keys` has a column `rate_limit_rpm INT DEFAULT 60`, this is not evaluated in `app.ts`. An automated script can bombard `/api/v1/messages` with thousands of concurrent requests.
- **Impact:** Resource exhaustion, denial of service, and unpredictable upstream provider charges.
- **Remediation Plan (Phase 4):**
  Implement in-memory sliding-window token bucket or Upstash Redis rate limiting on the Hono middleware before processing requests.

---

### FINDING SEC-06: Overly Permissive CORS Configuration
- **Severity:** 🟡 **MEDIUM**
- **CWE:** CWE-942 (Permissive Cross-origin Resource Sharing Policy)
- **Affected File:** `vercel.json`
- **Description:**
  ```json
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Credentials", "value": "true" }
      ]
    }
  ]
  ```
  Combining `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is an insecure CORS configuration flagged by modern browsers and security scanners.
- **Impact:** Potential CSRF and credential theft risks across browser sessions.
- **Remediation Plan (Phase 7):**
  Scope `Access-Control-Allow-Origin` to authorized customer domains and platform domains, or disable credentials when using `*`.

---

### FINDING SEC-07: Unvalidated Upstream Secret Handling
- **Severity:** 🟡 **MEDIUM**
- **CWE:** CWE-312 (Cleartext Storage of Sensitive Information)
- **Affected File:** `supabase/migrations/20261008_init.sql` (Line 49)
- **Description:**
  `upstream_credentials` has column `api_key_encrypted TEXT NOT NULL`, but application code lacks an encryption helper (such as AES-GCM-256 using an application master secret key).
- **Remediation Plan (Phase 4):**
  Implement AES-256-GCM envelope encryption for all stored upstream credentials.

---

### FINDING SEC-08: Unbounded Request Body Ingestion
- **Severity:** 🟡 **MEDIUM**
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Affected File:** `src/lib/gateway/app.ts` (Line 119)
- **Description:**
  `c.req.json()` parses unbounded request payloads without explicit body size limits or schema validation (e.g. Zod).
- **Remediation Plan (Phase 4):**
  Enforce maximum payload size (e.g., 2MB) and validate request payloads with Zod schemas.

---

### FINDING SEC-09: Absence of Privileged Audit Logging
- **Severity:** 🔵 **LOW**
- **CWE:** CWE-778 (Insufficient Logging)
- **Description:**
  Privileged operations such as creating/revoking keys, altering rate limits, or updating provider credentials are not tracked in an immutable audit ledger.
- **Remediation Plan (Phase 7):**
  Create an `audit_logs` table tracking Actor ID, IP, Action, Entity, and Changes.

---

### FINDING SEC-10: PII Masking Toggle Is Client-Side Mock
- **Severity:** 🔵 **INFORMATIONAL**
- **Affected File:** `src/components/guardrails/GuardrailsTab.tsx`
- **Description:**
  The "PII Data Sanitization" toggle in the Guardrails UI toggles local React state `maskPii` and does not actually filter credit card numbers, emails, or secrets in gateway traffic.
- **Remediation Plan (Phase 4):**
  Implement regex-based and token-pattern PII sanitizers on the gateway request pipeline.

---

## 3. Remediation Matrix by Phase

| Finding ID | Vulnerability | Severity | Target Phase | Status |
|---|---|---|---|---|
| **SEC-01** | Gateway API Key Verification Bypass | 🔴 Critical | Phase 4 | Documented |
| **SEC-02** | RLS Enabled with Zero Policies | 🔴 Critical | Phase 2 | Documented |
| **SEC-03** | Unauthenticated Dashboard Console | 🟠 High | Phase 2 | Documented |
| **SEC-04** | Insecure Key Generation & Hashes | 🟠 High | Phase 2 | Documented |
| **SEC-05** | Missing Edge Rate Limiting & Concurrency Controls | 🟠 High | Phase 4 | Documented |
| **SEC-06** | Overly Permissive CORS Headers | 🟡 Medium | Phase 7 | Documented |
| **SEC-07** | Missing Credential Encryption Helpers | 🟡 Medium | Phase 4 | Documented |
| **SEC-08** | Unbounded Request Payloads | 🟡 Medium | Phase 4 | Documented |
| **SEC-09** | Lack of Append-Only Audit Logging | 🔵 Low | Phase 7 | Documented |
| **SEC-10** | Mock PII Sanitization | 🔵 Info | Phase 4 | Documented |
