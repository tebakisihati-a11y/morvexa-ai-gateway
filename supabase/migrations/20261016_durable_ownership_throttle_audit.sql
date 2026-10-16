-- =============================================================================
-- Morvexa Nexus — Phase 5: Durable customer ownership, throttling & access audit
-- Date: 2026-10-16
-- Description: Follow-up to 20261015. That migration created the customer
--              tables but the application never wrote to them: profiles went to
--              a JSON file instead, because the code holds the anon key and
--              these tables enable RLS with auth.uid() policies that a
--              non-Supabase-Auth session can never satisfy. The application now
--              uses a service-role client for these tables, so this migration
--              adds the columns and tables that work needs:
--                * email verification state and the password epoch that the
--                  auth routes already read;
--                * key ownership, so a customer can list and revoke their keys;
--                * a shared rate-limit window so throttling survives a cold
--                  start and applies across instances;
--                * an access trail for reads of customer PII.
-- Apply after 20261015.
-- =============================================================================

-- 1. Customers: add the email-verification flag the auth routes depend on.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Credentials: the password epoch that invalidates sessions issued before a
--    reset. The read path already selects it; without the column the select
--    returns null and every reset silently failed to evict stale sessions.
ALTER TABLE customer_credentials
    ADD COLUMN IF NOT EXISTS password_changed_at BIGINT NOT NULL DEFAULT 0;

-- 3. API keys: ownership. Without these a customer cannot see which keys are
--    theirs, and the portal could not offer revoke without exposing every
--    tenant's keys.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS plan_code TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tokens_used BIGINT NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS total_token_cap BIGINT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS health_status TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS issue_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_customer ON api_keys (customer_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_customer_email ON api_keys (lower(customer_email));

-- 4. Rate-limit events, shared across instances.
--
--    The in-process limiter cannot hold a limit when a serverless platform runs
--    several instances: each one keeps its own counter, so a burst spread over
--    N instances gets N times the allowance. Persisting timestamps lets every
--    instance see the same window. Rows are pruned opportunistically by the
--    limiter; the index keeps that cheap.
CREATE TABLE IF NOT EXISTS rate_limit_events (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time ON rate_limit_events (key, occurred_at DESC);

-- 5. Customer PII access trail.
--
--    Separate from audit_logs on purpose. audit_logs.actor_id is a UUID with a
--    foreign key to auth.users, and owner sessions are not Supabase users, so
--    recording an owner read there would either fail the FK or need a null
--    actor. This table has no such constraint and is scoped to one question:
--    who looked at customer data, when, and how many records they received.
CREATE TABLE IF NOT EXISTS customer_access_audit (
    id TEXT PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_type TEXT NOT NULL,    -- owner_session, admin_secret, cron_secret, anonymous
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,        -- e.g. customer.list, customer.read
    scope TEXT NOT NULL,         -- the dataset touched, e.g. dashboard-data
    records_returned INT NOT NULL DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    succeeded BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_customer_access_time ON customer_access_audit (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_access_actor ON customer_access_audit (actor_id);

-- 6. Lock these down too. The service role bypasses RLS; the anon key must not
--    read the access trail or the throttling state.
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_access_audit ENABLE ROW LEVEL SECURITY;
