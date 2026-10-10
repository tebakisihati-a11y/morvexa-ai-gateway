# Morvexa Platform — Architecture Decision Records (ADR Log)

**Document:** `docs/architecture/ADR_LOG.md`  
**Date:** 2026-10-10  
**Status:** Approved (Phase 0 Audit Deliverable)  
**Author:** Morvexa Nexus Principal Software Architecture Team  

---

## Index of Architectural Decisions

- [ADR-001: Modular Monolith Architecture for Morvexa Nexus Control Plane](#adr-001-modular-monolith-architecture-for-morvexa-nexus-control-plane)
- [ADR-002: Multi-Tenant IAM with Supabase Auth SSR and Hierarchical RBAC](#adr-002-multi-tenant-iam-with-supabase-auth-ssr-and-hierarchical-rbac)
- [ADR-003: Payment Gateway Adapter Pattern Supporting Indonesian Payment Gateways](#adr-003-payment-gateway-adapter-pattern-supporting-indonesian-payment-gateways)
- [ADR-004: Decoupled Control Plane vs Data Plane Execution](#adr-004-decoupled-control-plane-vs-data-plane-execution)
- [ADR-005: State-Machine-Driven Hybrid Infrastructure Provisioning](#adr-005-state-machine-driven-hybrid-infrastructure-provisioning)
- [ADR-006: High-Security API Key Hashing and Revocation Strategy](#adr-006-high-security-api-key-hashing-and-revocation-strategy)

---

### ADR-001: Modular Monolith Architecture for Morvexa Nexus Control Plane

#### Context
Morvexa requires a centralized control plane (Morvexa Nexus) managing customer organizations, billing, subscriptions, API keys, AI gateway routing, and infrastructure provisioning. Introducing microservices, Kubernetes clusters, Kafka, or distributed service meshes at this stage would introduce immense operational complexity, multi-repository friction, increased hosting cost, and violate the *Tangga Minimal* rule.

#### Decision
Build Morvexa Nexus as a **Modular Monolith** inside the existing Next.js 15 repository:
- All domain modules (`identity`, `billing`, `gateway`, `infrastructure`, `analytics`, `notifications`) reside in discrete service directories under `src/modules/` or `src/lib/services/`.
- Domain services communicate via strict TypeScript interfaces and programmatic service contracts, not unverified HTTP hops.
- The existing Hono.js edge router remains mounted at `/api/[[...route]]` for lightweight edge execution, while Next.js Server Components and Server Actions handle dashboard rendering and administrative workflows.

#### Consequences
- **Positive:** Single deployment pipeline on Vercel, unified database migrations, shared TypeScript types, zero networking latency between internal domains, zero additional hosting costs.
- **Negative:** Shared process memory; heavy long-running background tasks must use scheduled cron triggers or external workers rather than infinite loops.

---

### ADR-002: Multi-Tenant IAM with Supabase Auth SSR and Hierarchical RBAC

#### Context
The platform requires support for both platform-level administrators (`PLATFORM_OWNER`, `SUPER_ADMIN`, `FINANCE_ADMIN`, `DEVOPS_ADMIN`, `SUPPORT_AGENT`) and tenant-level organization users (`CUSTOMER_OWNER`, `CUSTOMER_DEVELOPER`, `CUSTOMER_VIEWER`, `PUBLIC_USER`). The existing codebase has no functional authentication flow.

#### Decision
1. Standardize on **Supabase Auth SSR** (`@supabase/ssr`) with HTTP-only, secure, `SameSite=Lax` cookies for session storage.
2. Establish a unified `profiles` and `organization_members` schema in PostgreSQL.
3. Enforce **Row Level Security (RLS)** on all tenant tables using Postgres helper functions `auth.uid()` and `get_user_org_ids()`.
4. Enforce server-side role checks on every Server Action and API Route Handler. Never rely on client-side UI visibility.

#### Consequences
- **Positive:** Robust session security, protection against XSS token theft, strict multi-tenant isolation at the database layer.
- **Negative:** Requires creating clean auth routes (`/login`, `/register`, `/auth/callback`) and migrating Supabase client calls from browser client to SSR cookies.

---

### ADR-003: Payment Gateway Adapter Pattern Supporting Indonesian Payment Gateways

#### Context
Morvexa provides services in Indonesia and the Southeast Asia region, requiring support for Indonesian payment methods (QRIS, BCA/Mandiri/BRI Virtual Accounts, GoPay, OVO) while remaining extensible to international credit cards and Stripe. Provider SDKs should not be coupled directly to subscription business logic.

#### Decision
Implement a **Payment Gateway Adapter Pattern**:
```typescript
export interface PaymentGatewayAdapter {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhookSignature(headers: Record<string, string>, rawBody: string): Promise<boolean>;
  parseWebhookEvent(rawBody: string): Promise<PaymentWebhookEvent>;
  retrievePaymentStatus(externalId: string): Promise<PaymentStatusResult>;
  cancelRecurringBilling?(subscriptionId: string): Promise<boolean>;
}
```
1. Initial implementation targets Indonesian gateways (Midtrans Snap / Core API or Xendit Invoice API).
2. Webhooks are cryptographically validated against SHA-512 signatures or callback tokens.
3. Events are logged into an append-only `payment_webhook_events` table with uniqueness constraints on external transaction IDs to prevent replay attacks and duplicate activations.
4. Entitlements are granted only after authoritative webhook verification, never browser redirects.

#### Consequences
- **Positive:** Decoupled billing logic, pluggable payment providers, strict defense against payment tampering and double-crediting.
- **Negative:** Requires maintaining separate webhook parsers and signature validation logic per provider.

---

### ADR-004: Decoupled Control Plane vs Data Plane Execution

#### Context
The AI Gateway must route requests with ultra-low latency (sub-50ms overhead) and zero-buffer streaming. If the gateway executes synchronous multi-table relational queries and complex billing joins on every single token request, latency and database connection saturation will degrade gateway performance.

#### Decision
Separate the **Control Plane** from the **Data Plane**:
- **Control Plane:** Handles user logins, organization settings, plan creation, billing, checkout, and credential management. Writes to Supabase PostgreSQL.
- **Data Plane (Edge Gateway):** Receives AI requests, validates cached API key hashes, checks quota boundaries, and proxies to upstream AI providers.
- Validated key metadata and quota budgets are cached with short TTLs (e.g., 60 seconds) in memory or fast key-value storage.
- Usage events are recorded asynchronously or buffered to prevent database write stalls from blocking AI response streaming.

#### Consequences
- **Positive:** Edge gateway remains resilient even if the control plane database experiences brief maintenance or connection spikes; ultra-low latency.
- **Negative:** Eventual consistency of quota consumption within a bounded 60-second window.

---

### ADR-005: State-Machine-Driven Hybrid Infrastructure Provisioning

#### Context
Standard customers share multi-tenant edge capacity (Shared Mode), while Enterprise customers may request dedicated instances (Dedicated Mode), such as private VPS proxy containers or dedicated local GPU servers (`localhost:5002`). Provisioning must never execute arbitrary shell commands or expose infrastructure credentials.

#### Decision
Model infrastructure provisioning as an explicit, auditable **Finite State Machine**:
```
REQUESTED ──> VALIDATING ──> APPROVED ──> PROVISIONING ──> CONFIGURING ──> HEALTH_CHECK ──> ACTIVE
      │             │            │               │               │               │
      └─── Failed ──┴── Failed ──┴───── Failed ──┴────── Failed ─┴────── Failed ─┴──> PROVISIONING_FAILED
```
- Each state transition is persisted in `provisioning_jobs` with timestamps, error codes, and audit actor ID.
- Dedicated environments are abstracted via an `InfrastructureProvider` adapter (e.g. Docker API, VPS Cloud API, or Local Private Daemon).
- Automated health check probes poll dedicated endpoints before transitioning an environment to `ACTIVE`.

#### Consequences
- **Positive:** Idempotent, recoverable, auditable provisioning; zero risk of rogue shell injection.
- **Negative:** Requires background worker polling for status progression.

---

### ADR-006: High-Security API Key Hashing and Revocation Strategy

#### Context
The current prototype uses `Math.random()` and pseudo-hashes, and verifies only key prefixes. Production requires cryptographically secure, high-entropy API keys with instant revocation capabilities.

#### Decision
1. **Key Generation:** Generate 32 bytes of cryptographically secure random entropy (`crypto.getRandomValues`).
2. **Format:** `mvx_live_<32-char-base62>` or `mvx_test_<32-char-base62>`.
3. **Storage:** Only store the SHA-256 hash (`key_hash`), prefix (`key_prefix = "mvx_live_"`), and masked representation (`masked_key = "mvx_live_...9f2a"`). Never store raw secret keys in plaintext.
4. **Display:** Show the full raw secret to the customer exactly once upon creation.
5. **Lookup:** When a request arrives, compute SHA-256 of the Bearer token, query `api_keys WHERE key_hash = ? AND is_active = true`.

#### Consequences
- **Positive:** Leak of the database does not compromise active API keys; immediate revocation support; compliant with NIST SP 800-63B.
- **Negative:** Users who lose their secret key must rotate/regenerate it; keys cannot be recovered in plaintext.
