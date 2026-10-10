# Morvexa Nexus — Phased Database Migration Plan

**Document:** `docs/database/MIGRATION_PLAN.md`  
**Date:** 2026-10-10  
**Status:** Approved Migration Strategy (Phase 1)  
**Target Engine:** Supabase PostgreSQL  
**Rollback Policy:** Zero Data Loss, Additive Schema Changes Only  

---

## 1. Migration Strategy & Safety Rules

1. **Strictly Non-Destructive:** No production columns or existing tables from `20261008_init.sql` (`organizations`, `profiles`, `api_keys`, `upstream_credentials`, `rolling_quota_records`, `request_logs`) will be dropped or renamed.
2. **Safe Column Alterations:** All new columns added to existing tables must provide default values (`NOT NULL DEFAULT ...`) or be nullable, ensuring zero downtime for live database consumers.
3. **Additive Phasing:** Migrations are organized into self-contained SQL files applied in chronological sequence corresponding to development phases.
4. **Idempotent Statements:** All scripts use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

---

## 2. Chronological Migration Roadmap

```
+─────────────────────────────────────────────────────────────────────────────+
| Baseline: 20261008_init.sql                                                 |
| - Applied in production repository                                          |
| - organizations, profiles, api_keys, credentials, quota, request_logs       |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| Phase 2 Migration: 20261011_iam_and_rls.sql                                 |
| - Add: organization_members, projects, invitations, audit_logs              |
| - Add: get_user_org_ids() security definer function                         |
| - Implement: Comprehensive RLS policies on all existing & new tenant tables |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| Phase 3 Migration: 20261012_billing_and_subscriptions.sql                   |
| - Add: plans, plan_versions, subscriptions, subscription_entitlements       |
| - Add: payment_customers, checkout_sessions, payment_transactions          |
| - Add: payment_webhook_events, invoices, invoice_items, financial_ledger     |
| - Seed: Default plan catalog (Free, Starter, Pro, Business, Enterprise)     |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| Phase 4 Migration: 20261013_gateway_metering.sql                            |
| - Alter: api_keys (add project_id, expires_at, index on key_hash)           |
| - Alter: upstream_credentials (add encryption_iv)                           |
| - Alter: request_logs (add project_id, estimated_cost_usd)                  |
| - Add: usage_aggregates (hourly rollups for high-speed charting)            |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| Phase 5 Migration: 20261014_infrastructure.sql                              |
| - Add: infrastructure_environments, provisioning_jobs, health_check_events  |
| - Add: feature_flags, system_configuration                                  |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Rollback & Emergency Recovery Procedures

1. **Pre-Migration Snapshot:**
   Before applying any migration to a live staging or production environment, execute a verified Supabase database backup:
   ```bash
   # Export schema & data snapshot
   pg_dump --clean --if-exists --quote-all-identifiers -h <db_host> -U postgres -d postgres > backup_pre_migration.sql
   ```
2. **Rollback Scripts (`*_down.sql`):**
   Each migration file has an accompanying down-script that reverts new tables and dropped constraints without deleting user data.
3. **Data Loss Prevention:**
   If a migration fails midway:
   - Supabase / Postgres executes DDL transactions atomically. If a statement errors out, the transaction rolls back cleanly.
   - Live traffic to the edge gateway continues unaffected due to edge key caching.
