-- =============================================================================
-- Morvexa Nexus — Phase 3: Plans, Subscriptions, Payments & Financial Ledgers
-- Date: 2026-10-12
-- Description: Establishes catalog plans, subscription lifecycles, Midtrans/Xendit
--              payment transactions, idempotent webhook events, and double-entry ledgers.
-- =============================================================================

-- 1. Plans Catalog
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- developer, pro, apex, zenith, enterprise
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Plan Versions (Immutable pricing & quotas)
CREATE TABLE IF NOT EXISTS plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, annual
    price_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
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

-- 3. Subscriptions (Tenant Subscription State Machine)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES plan_versions(id),
    status TEXT NOT NULL DEFAULT 'active', -- trialing, active, pending_payment, past_due, canceled, expired
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    external_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_org ON subscriptions(org_id);

-- 4. Subscription Entitlements (Materialized active feature permissions)
CREATE TABLE IF NOT EXISTS subscription_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL, -- dedicated_infrastructure, custom_routing, prompt_caching
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    numeric_limit INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, feature_key)
);

-- 5. Payment Customers
CREATE TABLE IF NOT EXISTS payment_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- midtrans, xendit
    external_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, provider)
);

-- 6. Checkout Sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES plan_versions(id),
    provider TEXT NOT NULL, -- midtrans, xendit
    external_session_id TEXT UNIQUE,
    amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired, failed
    idempotency_key TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON checkout_sessions(org_id);

-- 7. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
    provider TEXT NOT NULL, -- midtrans, xendit
    external_transaction_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(14, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    payment_method TEXT, -- qris, bank_transfer, credit_card, gopay, shopeepay
    status TEXT NOT NULL DEFAULT 'pending', -- pending, settled, failed, refunded, expired, disputed
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON payment_transactions(org_id, created_at DESC);

-- 8. Payment Webhook Events (Audit & Replay Protection)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- midtrans, xendit
    event_id TEXT NOT NULL, -- provider event or transaction id
    event_type TEXT NOT NULL,
    signature TEXT NOT NULL,
    payload JSONB NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_lookup ON payment_webhook_events(provider, event_id);

-- 9. Invoices
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
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id, created_at DESC);

-- 10. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 4) NOT NULL,
    total_price NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Financial Ledger Entries (Double-Entry Auditability)
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
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_org ON financial_ledger_entries(org_id, created_at DESC);

-- 12. Enable Row Level Security (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger_entries ENABLE ROW LEVEL SECURITY;

-- 13. Declarative RLS Policies for Multi-Tenancy

-- Public / Authenticated can view active published plans & versions
CREATE POLICY "Anyone can view active plans"
ON plans FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Anyone can view published plan versions"
ON plan_versions FOR SELECT
USING (is_published = TRUE);

-- Tenant Isolation for Subscriptions
CREATE POLICY "Members can view org subscriptions"
ON subscriptions FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can view org entitlements"
ON subscription_entitlements FOR SELECT
USING (subscription_id IN (
    SELECT id FROM subscriptions WHERE org_id IN (SELECT get_user_org_ids())
));

-- Tenant Isolation for Checkouts, Transactions & Invoices
CREATE POLICY "Members can view org checkout sessions"
ON checkout_sessions FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can view org payment transactions"
ON payment_transactions FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can view org invoices"
ON invoices FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Members can view org invoice items"
ON invoice_items FOR SELECT
USING (invoice_id IN (
    SELECT id FROM invoices WHERE org_id IN (SELECT get_user_org_ids())
));

CREATE POLICY "Members can view org ledger entries"
ON financial_ledger_entries FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

-- Webhook events are restricted to service role / platform admins only (no tenant access)
-- Service role bypasses RLS by default in Supabase.

-- 14. Seed Catalog Plans (Standard Morvexa Pricing)
INSERT INTO plans (code, name, description)
VALUES 
    ('developer', 'Developer Starter', 'Free tier for indie developers and prototyping'),
    ('pro', 'Pro Workspace', 'For startups and high-performance production workloads'),
    ('apex', 'Apex Scale', 'For scaling companies with dedicated throughput and prompt caching'),
    ('zenith', 'Zenith Enterprise', 'Custom multi-region hybrid dedicated infrastructure')
ON CONFLICT (code) DO NOTHING;

INSERT INTO plan_versions (
    plan_id, version, billing_period, price_amount, currency,
    standard_req_5h_limit, standard_req_7d_limit,
    latest_token_daily_limit, latest_token_weekly_limit,
    rate_limit_rpm, max_projects, max_members, dedicated_eligible
)
SELECT 
    p.id, 1, 'monthly', 0.0000, 'IDR',
    50, 500, 50000, 300000, 30, 1, 1, FALSE
FROM plans p WHERE p.code = 'developer'
ON CONFLICT (plan_id, version, billing_period) DO NOTHING;

INSERT INTO plan_versions (
    plan_id, version, billing_period, price_amount, currency,
    standard_req_5h_limit, standard_req_7d_limit,
    latest_token_daily_limit, latest_token_weekly_limit,
    rate_limit_rpm, max_projects, max_members, dedicated_eligible
)
SELECT 
    p.id, 1, 'monthly', 750000.0000, 'IDR',
    250, 2500, 300000, 2000000, 120, 5, 10, FALSE
FROM plans p WHERE p.code = 'pro'
ON CONFLICT (plan_id, version, billing_period) DO NOTHING;

INSERT INTO plan_versions (
    plan_id, version, billing_period, price_amount, currency,
    standard_req_5h_limit, standard_req_7d_limit,
    latest_token_daily_limit, latest_token_weekly_limit,
    rate_limit_rpm, max_projects, max_members, dedicated_eligible
)
SELECT 
    p.id, 1, 'monthly', 2500000.0000, 'IDR',
    1000, 10000, 1500000, 10000000, 300, 20, 50, TRUE
FROM plans p WHERE p.code = 'apex'
ON CONFLICT (plan_id, version, billing_period) DO NOTHING;
