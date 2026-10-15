-- =============================================================================
-- Morvexa Nexus — Phase 4: Customer Identity, Credentials, Orders & Activity
-- Date: 2026-10-15
-- Description: Durable backing tables for customer self-service authentication.
--              Without these tables the application falls back to a JSON file on
--              disk, which does not survive serverless cold starts, so production
--              deployments MUST apply this migration.
-- =============================================================================

-- 1. Customers (public profile, never stores secrets)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'email', -- gmail, yahoo, email
    avatar TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended
    current_plan TEXT NOT NULL DEFAULT 'Developer Starter (Free)',
    token_balance BIGINT NOT NULL DEFAULT 0,
    tokens_used BIGINT NOT NULL DEFAULT 0,
    total_orders_count INT NOT NULL DEFAULT 0,
    total_spent_idr BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (lower(email));

-- 2. Customer Credentials (password hashes; server-only, never exposed via API)
CREATE TABLE IF NOT EXISTS customer_credentials (
    customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- scrypt record, format: scrypt$N$r$p$salt$hash
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0, -- epoch milliseconds
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_customer_credentials_email ON customer_credentials (lower(email));

-- 3. Customer Orders (billing history surfaced in the customer portal)
CREATE TABLE IF NOT EXISTS customer_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    order_type TEXT NOT NULL, -- plan_subscription, model_token_purchase
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    amount_idr BIGINT NOT NULL DEFAULT 0,
    tokens_granted BIGINT NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- settled, pending, failed
    api_key_dispatched TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_orders_email ON customer_orders (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders (customer_id);

-- 4. Customer Activity (append-only feed rendered in the Owner Control Plane)
CREATE TABLE IF NOT EXISTS customer_activities (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_customer_activities_timestamp ON customer_activities (timestamp DESC);

-- 5. Lock down credential access.
--    Password hashes are read only by trusted server routes using the service
--    role key. Enabling RLS with no permissive policy denies the anon key any
--    access, so a leaked public key cannot read or enumerate hashes.
ALTER TABLE customer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activities ENABLE ROW LEVEL SECURITY;

-- Customers may read only their own profile; writes go through the server.
DROP POLICY IF EXISTS customers_select_own ON customers;
CREATE POLICY customers_select_own ON customers
    FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS customer_orders_select_own ON customer_orders;
CREATE POLICY customer_orders_select_own ON customer_orders
    FOR SELECT USING (auth.uid()::text = customer_id);

DROP POLICY IF EXISTS customer_activities_select_own ON customer_activities;
CREATE POLICY customer_activities_select_own ON customer_activities
    FOR SELECT USING (auth.uid()::text = customer_id);
