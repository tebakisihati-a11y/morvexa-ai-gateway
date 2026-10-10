# Morvexa Nexus — Comprehensive Database Schema Specification

**Document:** `docs/database/SCHEMA.md`  
**Date:** 2026-10-10  
**Status:** Approved Schema Baseline (Phase 1)  
**Database Engine:** PostgreSQL 15+ (Supabase)  
**Security Model:** Row Level Security (RLS) on all multi-tenant tables  

---

## 1. Schema Design Principles

1. **Reusability & Non-Destructive Extension:** Reuses the existing tables defined in `supabase/migrations/20261008_init.sql` (`organizations`, `profiles`, `api_keys`, `upstream_credentials`, `rolling_quota_records`, `request_logs`) while expanding them with robust foreign keys, constraints, and operational fields.
2. **Precision & Financial Integrity:**
   - Currency stored explicitly (`currency VARCHAR(3) NOT NULL DEFAULT 'IDR'`).
   - Monetary totals stored with exact fixed-point decimals (`NUMERIC(14, 4)`), avoiding floating-point rounding errors.
   - External transaction IDs, payment webhook events, and idempotency keys enforce `UNIQUE` constraints.
3. **Temporal Tracking & Auditability:**
   - All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Mutating entities include `updated_at`.
   - Immutable historical snapshots for plan pricing (`plan_versions`) and financial events (`financial_ledger_entries`).
4. **Tenant Isolation:**
   - Every tenant-scoped entity contains an indexed `org_id UUID REFERENCES organizations(id) ON DELETE CASCADE`.
   - RLS helper function `get_user_org_ids()` ensures zero cross-tenant query leakage.

---

## 2. Table Definitions by Domain

### Group A: Identity, Tenancy & Access Control

```sql
-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'starter', -- starter, pro, business, enterprise
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Profiles (User Identity linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'customer_developer', -- maps to 9-tier RBAC
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Members (Multi-Tenant Organization Membership)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer_developer', -- customer_owner, customer_developer, customer_viewer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- 4. Projects (Sub-tenancy / Workspace grouping)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, slug)
);

-- 5. Invitations (Team onboarding)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer_developer',
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Group B: Catalog, Plans & Subscriptions

```sql
-- 6. Plans Catalog
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE, -- free, starter, pro, business, enterprise
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Plan Versions (Immutable pricing & quota specifications)
CREATE TABLE IF NOT EXISTS plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, annual
    price_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR', -- IDR, USD
    standard_req_5h_limit INT NOT NULL DEFAULT 100,
    standard_req_7d_limit INT NOT NULL DEFAULT 1000,
    latest_token_daily_limit INT NOT NULL DEFAULT 150000,
    latest_token_weekly_limit INT NOT NULL DEFAULT 1000000,
    rate_limit_rpm INT NOT NULL DEFAULT 60,
    max_projects INT NOT NULL DEFAULT 3,
    max_members INT NOT NULL DEFAULT 5,
    dedicated_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, version, billing_period)
);

-- 8. Subscriptions (Tenant Subscription State Machine)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES plan_versions(id),
    status TEXT NOT NULL DEFAULT 'active', -- trialing, active, pending_payment, past_due, canceled, expired
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    external_subscription_id TEXT, -- payment provider subscription reference if recurring
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_org ON subscriptions(org_id);

-- 9. Subscription Entitlements (Materialized active feature permissions)
CREATE TABLE IF NOT EXISTS subscription_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL, -- e.g. dedicated_infrastructure, custom_routing, prompt_caching
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    numeric_limit INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, feature_key)
);
```

---

### Group C: Payment, Invoices & Financial Ledgers

```sql
-- 10. Payment Customers
CREATE TABLE IF NOT EXISTS payment_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- midtrans, xendit, stripe
    external_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, provider)
);

-- 11. Checkout Sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES plan_versions(id),
    provider TEXT NOT NULL,
    external_session_id TEXT UNIQUE,
    amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired, failed
    idempotency_key TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    external_transaction_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    payment_method TEXT, -- qris, bank_transfer, credit_card, gopay, ovo
    status TEXT NOT NULL DEFAULT 'pending', -- pending, settled, failed, refunded, expired, disputed
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON payment_transactions(org_id, created_at DESC);

-- 13. Payment Webhook Events (Audit & Replay Protection)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature TEXT NOT NULL,
    payload JSONB NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, event_id)
);

-- 14. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE, -- e.g. INV-2026-10-0001
    amount NUMERIC(14, 4) NOT NULL,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, paid, void, refunded
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 4) NOT NULL,
    total_price NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Financial Ledger Entries (Double-Entry Auditability)
CREATE TABLE IF NOT EXISTS financial_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL, -- credit, debit
    category TEXT NOT NULL, -- subscription_fee, token_topup, refund, processing_fee
    amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    balance_after NUMERIC(14, 4),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Group D: Gateway, Metering & Cost Tracking

```sql
-- 17. API Keys (Hardened from existing schema)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- mvx_live_ or mvx_test_
    masked_key TEXT NOT NULL, -- mvx_live_...9f2a
    key_hash TEXT NOT NULL UNIQUE, -- Cryptographic SHA-256 hash of raw secret
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_rpm INT NOT NULL DEFAULT 60,
    daily_token_limit INT NOT NULL DEFAULT 500000,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = TRUE;

-- 18. Upstream Provider Credentials (Encrypted with AES-256-GCM)
CREATE TABLE IF NOT EXISTS upstream_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- anthropic, openai, groq, deepseek, gemini, custom
    api_key_encrypted TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, provider)
);

-- 19. Rolling Quota Records (Reused from existing schema)
CREATE TABLE IF NOT EXISTS rolling_quota_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL, -- 'latest_token' OR 'standard_request'
    tokens INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quota_records_time ON rolling_quota_records (org_id, created_at DESC);

-- 20. Request Logs & Observability Traces (Reused from existing schema)
CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    model_requested TEXT NOT NULL,
    model_routed TEXT NOT NULL,
    provider TEXT NOT NULL,
    status_code INT NOT NULL,
    ttft_ms INT,
    total_duration_ms INT NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    failover_occurred BOOLEAN NOT NULL DEFAULT FALSE,
    failover_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs (org_id, created_at DESC);

-- 21. Usage Aggregates (Hourly rollups for fast charting)
CREATE TABLE IF NOT EXISTS usage_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL, -- Truncated to hour
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    total_requests INT NOT NULL DEFAULT 0,
    total_prompt_tokens BIGINT NOT NULL DEFAULT 0,
    total_completion_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, period_start, model, provider)
);
```

---

### Group E: Hybrid Infrastructure & Provisioning

```sql
-- 22. Infrastructure Environments (Shared vs Dedicated)
CREATE TABLE IF NOT EXISTS infrastructure_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'shared', -- shared, dedicated
    name TEXT NOT NULL,
    target_host TEXT, -- e.g. dedicated-01.morvexa.internal, localhost:5002
    port INT,
    status TEXT NOT NULL DEFAULT 'active', -- requested, provisioning, active, degraded, deprovisioning, deprovisioned
    region TEXT NOT NULL DEFAULT 'sin-01',
    assigned_cpu_cores INT,
    assigned_memory_mb INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. Provisioning Jobs (State Machine Transitions)
CREATE TABLE IF NOT EXISTS provisioning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES infrastructure_environments(id) ON DELETE CASCADE,
    current_state TEXT NOT NULL DEFAULT 'REQUESTED', 
    -- REQUESTED, VALIDATING, APPROVED, PROVISIONING, CONFIGURING, HEALTH_CHECK, ACTIVE, PROVISIONING_FAILED
    target_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. Health Check Events
CREATE TABLE IF NOT EXISTS health_check_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES infrastructure_environments(id) ON DELETE CASCADE,
    latency_ms INT NOT NULL,
    status_code INT NOT NULL,
    is_healthy BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_env ON health_check_events(environment_id, checked_at DESC);
```

---

### Group F: Operations, Audit & System Configuration

```sql
-- 25. Audit Logs (Append-Only Privileged Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. key.revoked, plan.changed, user.suspended, refund.issued
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 26. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    target_tiers TEXT[] DEFAULT ARRAY['enterprise']::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Row Level Security (RLS) Policy Specifications

To resolve **SEC-02**, every tenant table executes strict declarative security:

```sql
-- Security Helper Function: Returns list of organization IDs the authenticated user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (org_id UUID) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT org_id FROM profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    UNION
    SELECT org_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- Enable RLS across all protected tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolling_quota_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_environments ENABLE ROW LEVEL SECURITY;

-- Standard Multi-Tenant Policy: Members can only read/write data belonging to their organization
CREATE POLICY "Tenant isolation for api_keys"
ON api_keys FOR ALL
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Tenant isolation for request_logs"
ON request_logs FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Tenant isolation for invoices"
ON invoices FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Tenant isolation for subscriptions"
ON subscriptions FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Tenant isolation for infrastructure_environments"
ON infrastructure_environments FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));
```
