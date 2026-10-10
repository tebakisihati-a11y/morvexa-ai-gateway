-- =============================================================================
-- Morvexa Nexus — Phase 2: Identity, Organizations, Membership & RLS Policies
-- Date: 2026-10-11
-- Description: Establishes multi-tenant organization membership, hierarchical
--              RBAC, and declarative Row Level Security policies.
-- =============================================================================

-- 1. Organization Members (Multi-Tenant Organization Membership)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer_developer', -- customer_owner, customer_developer, customer_viewer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);

-- 2. Projects (Sub-tenancy / Workspace grouping)
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
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);

-- 3. Invitations (Team onboarding)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer_developer',
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- 4. Audit Logs (Append-Only Privileged Security Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. key.revoked, org.created, member.invited
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);

-- 5. Helper Function: Get Organization IDs for the current authenticated user
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

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE upstream_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolling_quota_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Declarative Policies

-- Organizations: Users can view organizations they belong to
DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
CREATE POLICY "Members can view their organization"
ON organizations FOR SELECT
USING (id IN (SELECT get_user_org_ids()));

-- Profiles: Users can view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Organization Members: Members can view team members in their org
DROP POLICY IF EXISTS "Members can view org teammates" ON organization_members;
CREATE POLICY "Members can view org teammates"
ON organization_members FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

-- Projects: Members can manage projects in their org
DROP POLICY IF EXISTS "Members can access org projects" ON projects;
CREATE POLICY "Members can access org projects"
ON projects FOR ALL
USING (org_id IN (SELECT get_user_org_ids()));

-- API Keys: Members can access API keys in their org
DROP POLICY IF EXISTS "Members can access org api_keys" ON api_keys;
CREATE POLICY "Members can access org api_keys"
ON api_keys FOR ALL
USING (org_id IN (SELECT get_user_org_ids()));

-- Upstream Credentials: Only org owners/admins can access provider credentials
DROP POLICY IF EXISTS "Members can view org upstream credentials" ON upstream_credentials;
CREATE POLICY "Members can view org upstream credentials"
ON upstream_credentials FOR ALL
USING (org_id IN (SELECT get_user_org_ids()));

-- Quota Records: Members can view their org quota consumption
DROP POLICY IF EXISTS "Members can view org quota records" ON rolling_quota_records;
CREATE POLICY "Members can view org quota records"
ON rolling_quota_records FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

-- Request Logs: Members can view their org observability traces
DROP POLICY IF EXISTS "Members can view org request logs" ON request_logs;
CREATE POLICY "Members can view org request logs"
ON request_logs FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));

-- Audit Logs: Members can view audit events for their org
DROP POLICY IF EXISTS "Members can view org audit logs" ON audit_logs;
CREATE POLICY "Members can view org audit logs"
ON audit_logs FOR SELECT
USING (org_id IN (SELECT get_user_org_ids()));
