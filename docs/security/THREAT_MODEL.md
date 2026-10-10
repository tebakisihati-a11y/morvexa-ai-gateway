# Morvexa Nexus — Security Threat Model & ASVS Mapping

**Document:** `docs/security/THREAT_MODEL.md`  
**Date:** 2026-10-10  
**Status:** Approved Security Baseline (Phase 1)  
**Author:** SaaS Multi-Tenant Security & Infrastructure Team  
**Methodology:** STRIDE Threat Analysis & OWASP ASVS v4.0  

---

## 1. STRIDE Threat Analysis Matrix

| STRIDE Category | Threat Description | Attack Vector | Morvexa Nexus Mitigation |
|---|---|---|---|
| **Spoofing** | Forged API Keys | Passing arbitrary strings starting with `mvx_live_` to `/api/v1/messages`. | Authoritative SHA-256 database verification + key active check. Non-existent keys are rejected with 401. |
| **Spoofing** | Fake Payment Webhook | Attacker sends forged HTTP POST to `/api/billing/webhooks/midtrans` claiming order settled. | Cryptographic signature validation: recalculate SHA-512 digest using secret `ServerKey`. |
| **Tampering** | Price or Plan Modification | Client tampers with price in checkout payload to purchase enterprise plan for IDR 10,000. | Zero trust in client payloads. Backend ignores client price and queries authoritative price from `plan_versions` table. |
| **Tampering** | State Reversion in Webhooks | Attacker delivers delayed `pending` event to revert an already `settled` order. | Monotonic state transitions enforced in SQL: transactions in `settled` state cannot transition back to `pending`. |
| **Repudiation** | Denying Privileged Admin Action | Rogue administrator suspends customer or alters subscription without record. | Append-only `audit_logs` table tracking Actor ID, IP, user-agent, entity, and state diffs. |
| **Information Disclosure** | Upstream Provider Key Leakage | Upstream Anthropic/OpenAI keys exposed in client bundles or public endpoints. | Upstream keys stored encrypted with AES-256-GCM. Never returned to frontend UI or included in Next.js client bundles. |
| **Information Disclosure** | Cross-Tenant Data Access | Tenant A queries `/api/billing/invoices` and accesses Tenant B's invoices. | PostgreSQL Row Level Security (RLS) dynamically filters rows based on authenticated `get_user_org_ids()`. |
| **Denial of Service** | Edge Gateway Resource Exhaustion | Unbounded concurrent streaming requests overwhelm edge memory or upstream limits. | Sliding-window token bucket rate limiter (RPM) + concurrency cap per organization (max 10 streams). |
| **Elevation of Privilege** | Profile Self-Promotion | User sends `PATCH /api/profiles` with `{ "role": "platform_owner" }`. | Authorization is enforced in database and server-side middleware. Role column is unmodifiable by regular users. |

---

## 2. OWASP ASVS v4.0 Compliance Checklist

- **V1: Architecture, Design and Threat Modeling:**
  - Distinct Control Plane and Data Plane boundaries established.
  - Automated threat modeling and modular service boundaries documented.
- **V2: Authentication Verification:**
  - Supabase Auth SSR with HTTP-only, secure, `SameSite=Lax` cookies.
  - API keys generated using 32 bytes of cryptographically secure randomness (`crypto.getRandomValues`).
- **V3: Session Management:**
  - Session tokens rotated on privilege level changes; immediate session termination on logout or account suspension.
- **V4: Access Control Verification:**
  - 9-tier hierarchical RBAC enforced server-side.
  - PostgreSQL Row Level Security (RLS) active on every tenant table.
- **V5: Validation, Sanitization and Encoding:**
  - Strict Zod schema validation on incoming JSON payloads.
  - Regex-based PII masking for emails, credit cards, and tokens in prompt pipelines.
- **V6: Cryptography at Rest:**
  - Upstream provider credentials encrypted using AES-256-GCM with unique initialization vectors (IV).
  - API keys hashed with SHA-256 before storage.
