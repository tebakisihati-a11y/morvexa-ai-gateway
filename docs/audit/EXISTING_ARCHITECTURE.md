# Morvexa Platform — Existing Architecture & Component Map

**Document:** `docs/audit/EXISTING_ARCHITECTURE.md`  
**Date:** 2026-10-10  
**Status:** Complete (Phase 0 Audit Deliverable)  
**Author:** Morvexa Nexus Principal Architecture & Engineering Team  
**Scope:** Current Technical Architecture, Request Lifecycle, Data Flow, Topology & Boundaries  

---

## 1. System Overview

The current Morvexa system is structured as an **Edge-enabled Next.js 15 Monolith**, combining a client-rendered telemetry dashboard with a lightweight Hono.js edge API router deployed to Vercel Serverless infrastructure.

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  - Web Browser / Developer Portal (https://morvexa-sistem.vercel.app/)               |
|  - External AI Consumers (cURL, Python SDK, Node.js OpenAI/Anthropic SDKs)           |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | HTTPS (Edge Routing)
                                            v
+---------------------------------------------------------------------------------------+
|                               VERCEL HOSTING RUNTIME                                  |
|                                                                                       |
|  +-------------------------------------+   +---------------------------------------+  |
|  |     Next.js 15 App Shell (SPA)      |   |        Hono.js API Route Handler      |  |
|  |     - Page: / (AppRoot)             |   |        - Path: /api/[[...route]]      |  |
|  |     - React 19 Client Components    |   |        - Adapter: @hono/vercel        |  |
|  |     - Lucide + Tailwind v4 Styling  |   |        - Routes: /metrics, /models,   |  |
|  |     - In-Memory Fallback State      |   |                  /messages,           |  |
|  |       (memoryApiKeys, traces, etc.) |   |                  /chat/completions    |  |
|  +-------------------------------------+   +-------------------+-------------------+  |
|                                                                |                      |
+----------------------------------------------------------------|----------------------+
                                                                 |
                   +---------------------------------------------+
                   |
        +----------+----------+---------------------------------+
        |                     |                                 |
        v                     v                                 v
+---------------+     +--------------------+          +--------------------+
|  Anthropic    |     | OpenAI / DeepSeek  |          | Private Server     |
|  Claude API   |     | Groq / Gemini APIs |          | (localhost:5002)   |
+---------------+     +--------------------+          +--------------------+
        ^
        | (Optional live database - currently unconfigured in production)
        v
+---------------------------------------------------------------------------------------+
|                              SUPABASE POSTGRESQL (DB TIER)                            |
|  - Schema: organizations, profiles, api_keys, upstream_credentials,                   |
|            rolling_quota_records, request_logs                                        |
|  - RLS: Enabled on all tables (0 policies defined)                                    |
+---------------------------------------------------------------------------------------+
```

---

## 2. Component Inventory & Directory Mapping

| Layer / Subsystem | Source Path | Key Responsibilities | Runtime Environment |
|---|---|---|---|
| **Entrypoint** | `src/app/page.tsx` | Main dashboard shell, tab switching, client-side state holder | Client Browser |
| **Edge Router Adapter** | `src/app/api/[[...route]]/route.ts` | Exports `GET, POST, PUT, DELETE` using `hono/vercel` | Vercel Serverless |
| **Hono Gateway App** | `src/lib/gateway/app.ts` | Endpoint definitions, request parsing, response formatting | Vercel Serverless |
| **Auth Verifier** | `src/lib/gateway/auth.ts` | Validates `Authorization: Bearer <key>` format and prefix | In-process |
| **Failover Resolver** | `src/lib/gateway/failover.ts` | Matches model string to provider; static fallback chains | In-process |
| **Upstream Proxy** | `src/lib/gateway/upstream.ts` | Fetches from Anthropic, OpenAI, DeepSeek, Groq, custom | Edge fetch |
| **SSE Streamer** | `src/lib/gateway/stream.ts` | Generates Anthropic-compatible Server-Sent Events | Streaming Response |
| **Quota Engine** | `src/lib/quota.ts` | Rolling 5h request & 24h/7d token arithmetic | Pure functional |
| **Database Store** | `src/lib/supabase/store.ts` | In-memory arrays with mock seed data, Supabase client fallback | In-process / Client |
| **Database Client** | `src/lib/supabase/client.ts` | `@supabase/supabase-js` initialization | Universal |
| **Database Schema** | `supabase/migrations/20261008_init.sql` | PostgreSQL DDL table definitions and indexes | Supabase Postgres |

---

## 3. Current Request Lifecycle

### Request Flow: `POST /api/v1/messages` (Anthropic Protocol)
1. **Request Ingestion:** Client sends HTTP `POST` to `/api/v1/messages` with JSON payload `{ model, messages, stream }` and header `Authorization: Bearer <key>`.
2. **Authentication Parsing (`auth.ts`):**
   - Header is inspected for `Bearer ` prefix.
   - Token string is inspected: must begin with `mvx_live_` or `mvx_test_`.
   - **Current Behavior:** If prefix matches, request is granted immediately (`{ valid: true }`). No tenant lookup or database hash verification is performed.
3. **Route & Model Resolution (`failover.ts`):**
   - Model name is inspected (e.g. `claude-3-7-sonnet` -> `anthropic`; `deepseek-chat` -> `deepseek`; `gpt-4o` -> `openai`).
4. **Upstream Forwarding (`upstream.ts`):**
   - Checks `process.env[PROVIDER_API_KEY]`.
   - **Case A (Key exists):** Sends outbound HTTP `fetch` to provider API. If response is OK, streams or returns provider response with custom headers (`X-Morvexa-Provider`, `X-Morvexa-Live`).
   - **Case B (Key absent / simulated mode):** Returns `null`.
5. **Simulated Response Generation (`stream.ts` / `app.ts`):**
   - If streaming (`stream: true`), `createAnthropicSseStream` creates a synthetic SSE event stream (`message_start`, `content_block_start`, delta chunks, `message_delta`, `message_stop`).
   - If non-streaming, returns synthetic JSON message structure.
6. **Telemetry & Metering:**
   - **Current Behavior:** No database log or quota record is persisted.

### Request Flow: `POST /api/v1/chat/completions` (OpenAI Protocol)
- Follows identical auth check.
- Returns static simulated OpenAI completion JSON (`chatcmpl-mvx-...`).
- Upstream forwarding for OpenAI streaming is not yet connected in the router.

---

## 4. Current Database Schema & Entity Relationships

The existing schema in `supabase/migrations/20261008_init.sql` models the following relational structure:

```
auth.users (Supabase Managed Auth)
    │
    │ 1:1
    ▼
profiles (id, org_id, full_name, email, role, created_at)
    │
    │ N:1
    ▼
organizations (id, name, slug, tier, created_at, updated_at)
    │
    ├───< api_keys (id, org_id, name, key_prefix, masked_key, key_hash, is_active, rate_limit_rpm, daily_token_limit, ...)
    │        │
    │        ├───< rolling_quota_records (id, org_id, key_id, model_type, tokens, created_at)
    │        │
    │        └───< request_logs (id, org_id, key_id, endpoint, model_requested, provider, status_code, tokens, ...)
    │
    └───< upstream_credentials (id, org_id, provider, api_key_encrypted, priority, is_active, ...)
```

### Table Properties:
- `organizations`: Simple tenant record with `tier` text (`starter`, `pro`, `apex`, `zenith`, `enterprise`).
- `profiles`: Links Supabase Auth user to an organization with a `role` (`admin`, `developer`, `viewer`).
- `api_keys`: Contains token hashes and rate limit / token limit settings.
- `upstream_credentials`: Allows organizations to store their own provider API keys (`api_key_encrypted`).
- `rolling_quota_records`: Event-based ledger recording token consumption.
- `request_logs`: Telemetry records for performance analysis and traces.

---

## 5. Deployment Topology & Infrastructure

1. **Vercel Project:**
   - Name: `morvexa-sistem`
   - Project ID: `prj_7I2CjARgt7Z3gmCag7ya8PPSxD5S`
   - Region: Singapore (`sin1`) edge node with global CDN distribution.
   - Deployed URL: `https://morvexa-sistem.vercel.app/`
2. **DNS & SSL:**
   - Handled natively by Vercel edge edge network with automatic Let's Encrypt / DigiCert SSL certificates.
   - CORS headers configured in `vercel.json` for all `/api/(.*)` paths.
3. **Database Connectivity:**
   - Uses Supabase JS SDK client over HTTPS REST/PostgREST.
   - Direct connection pooling (e.g. pgBouncer port 6543) is not yet configured.

---

## 6. Trust Boundaries & Gap Analysis

| Boundary | Intended State | Current Actual State | Remediation Path |
|---|---|---|---|
| **Client <-> Console** | Authenticated via secure HTTP-only session cookie | Completely unauthenticated; anyone can access | Integrate Supabase Auth SSR with protected server layout |
| **API Client <-> Gateway** | Authenticated via hashed key lookup in database | Format prefix check only | SHA-256 database lookup with memory caching |
| **Gateway <-> Quota** | Concurrent atomic reservation before forwarding | Disconnected | Atomic PostgreSQL or Redis quota reservation |
| **Customer <-> Billing** | Verified payment gateway checkout & webhooks | Non-existent | Payment adapter (Midtrans/Xendit) with verified signatures |
| **Tenant <-> Tenant** | Enforced by Row Level Security on database | RLS enabled with 0 policies | Complete RLS policy migration enforcing `org_id` |
| **System <-> Infrastructure** | Provisioning engine for shared/dedicated nodes | Non-existent | Provisioning state machine and provider adapter |
