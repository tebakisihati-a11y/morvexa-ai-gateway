# Morvexa AI Gateway — Architecture & Design Specification

**Date:** 2026-10-08  
**Status:** Approved  
**Project:** Morvexa AI Gateway (Universal Edge AI Gateway & Observability Hub)  
**Author:** Antigravity Engineering  

---

## 1. Executive Summary & Objective

**Morvexa AI Gateway** is a high-performance, developer-first AI proxy and observability gateway designed to unify, route, rate-limit, and monitor AI model interactions across multiple upstream providers (Anthropic Claude, OpenAI, Google Gemini, Groq, DeepSeek). 

Inspired by the proxy gateway architecture of Olagon AI Gateway (`gateway.olagon.site`), Morvexa expands beyond standard proxying by introducing:
1. **A Dual Rolling Quota Engine** with real-time rolling recovery windows (5-hour request recovery TTL + 7-day token cap).
2. **Zero-Buffer SSE Streaming** with live Time-To-First-Token (TTFT) and token-velocity calculation.
3. **Multi-Provider Intelligent Failover** with automatic fallback chains across Anthropic, DeepSeek, OpenAI, Gemini, and Groq.
4. **Bespoke, Anti-AI-Slop Engineering UI** inspired by high-density consoles (Linear, Cloudflare Radar, Vercel Geist), avoiding generic purple card gradients and meaningless AI clichés.
5. **100% Free Cloud Infrastructure** utilizing Next.js 15 App Router, embedded Hono.js Edge routes, Tailwind CSS v4, shadcn/ui primitives, and Supabase free tier database/auth.

---

## 2. Technology Stack & Deployment Architecture

### 2.1 Core Technologies
* **Framework:** Next.js 15 (App Router, React 19, Server Components & Server Actions)
* **Styling & Design System:** Tailwind CSS v4 (`@theme` modern CSS engine) + shadcn/ui + Radix UI Primitives + Lucide Icons + Geist Fonts
* **API Router & Proxy Engine:** Hono.js (`@hono/node-server` and edge adapter inside `app/api/[[...route]]/route.ts`)
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth SSR, Row-Level Security, Realtime WebSockets)
* **Testing & Quality:** TypeScript 5.x strict mode, Vitest / Node test runner

### 2.2 Free Hosting & Domain Strategy (Zero Cost)
* **Hosting:** Vercel Hobby Tier (Unlimited static deployments, Serverless/Edge functions for Hono API routes)
* **Database:** Supabase Free Tier (500 MB Postgres, 50,000 MAU, SSL enabled)
* **Domain:** Instant free SSL via `*.vercel.app` or free DNS routing via `is-a.dev` / `js.org`

---

## 3. System Architecture & Components

```
                   +---------------------------------------------+
                   |               Client Apps                   |
                   |   (cURL / Python / Node / Web Applications) |
                   +----------------------+----------------------+
                                          |
                                          | HTTPS Request (Bearer mvx_live_xxx)
                                          v
      +-------------------------------------------------------------------------+
      |                         Morvexa AI Gateway                              |
      |                                                                         |
      |  [Next.js 15 Shell & Dashboard]       [Hono.js Edge Router]             |
      |  - Telemetry Radar                    - Key Authentication (SHA-256)    |
      |  - Live Quota Visualizer              - Dual Quota & Rolling Window     |
      |  - API Key & Policy Manager           - Failover Routing Engine         |
      |  - Interactive SSE Playground         - Zero-Buffer SSE Stream Engine   |
      |  - Live Request Traces / Logs         - Prompt Cache & Data Masking     |
      +-----------------------------------+-------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
             +--------------------+              +--------------------+
             |  Supabase Postgres |              | Upstream Providers |
             |  - Users & Auth    |              | - Anthropic Claude |
             |  - API Keys        |              | - OpenAI / GPT-4o  |
             |  - Quota Windows   |              | - Google Gemini    |
             |  - Request Logs    |              | - Groq / DeepSeek  |
             +--------------------+              +--------------------+
```

---

## 4. Database Schema (Supabase PostgreSQL)

```sql
-- 1. Profiles & Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tier TEXT DEFAULT 'starter' -- starter, pro, apex, zenith, enterprise
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin', -- admin, developer, viewer
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Gateway API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- e.g. mvx_live_
    key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of secret key
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_rpm INT DEFAULT 60,
    daily_token_limit INT DEFAULT 500000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 3. Upstream Provider Credentials (BYOK / Managed)
CREATE TABLE upstream_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- anthropic, openai, groq, deepseek, gemini
    api_key_encrypted TEXT NOT NULL,
    priority INT DEFAULT 1, -- 1 = primary, 2 = fallback 1, etc.
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rolling Quota Windows
CREATE TABLE rolling_quota_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL, -- 'latest_token' OR 'standard_request'
    tokens_consumed INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quota_records_key_time ON rolling_quota_records (key_id, created_at);

-- 5. Request Traces & Audit Logs
CREATE TABLE request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL, -- /v1/messages or /v1/chat/completions
    model_requested TEXT NOT NULL,
    model_routed TEXT NOT NULL,
    status_code INT NOT NULL,
    ttft_ms INT,
    total_duration_ms INT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cached BOOLEAN DEFAULT FALSE,
    failover_occurred BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_request_logs_org_time ON request_logs (org_id, created_at DESC);
```

---

## 5. Gateway Logic & Dual Rolling Quota Specifications

### 5.1 Dual Quota Architecture
* **Scheme 1: Latest Models (Token Cap)**:
  * Applies to frontier models (Claude 3.7 Sonnet, Opus, GPT-4.5, o3-mini).
  * Evaluated via sliding window sum of `tokens_consumed` over the past 24 hours (Daily) and 7 days (Weekly).
* **Scheme 2: Standard & Fast Models (5-Hour Rolling Request Cap)**:
  * Applies to high-throughput models (Claude 3.5 Sonnet, Claude 3.5 Haiku, Gemini 2.0 Flash, DeepSeek V3).
  * Monitored via exact timestamp count: each request has a **5-hour TTL**. Once a request is > 5 hours old, it automatically falls off the rolling window and restores capacity.
  * Real-time calculation provides the exact timestamp for the next available slot restoration:
    $$\Delta t_{\text{next\_restore}} = \min_{r \in \text{active}} (\text{timestamp}_r + 5\text{ hours}) - \text{now}$$

### 5.2 Zero-Buffer SSE Streaming
* Utilizes Web Standard `ReadableStream` through Hono.js streaming response helpers.
* First chunk emitted triggers the `TTFT (Time To First Token)` metric recording.
* As chunks pass through the passthrough stream transformer, byte length and token count are calculated on the fly without halting or buffering client playback.

### 5.3 Smart Failover Protocol
```
Incoming Request -> Key Verification -> Quota Check 
  -> Try Upstream 1 (e.g. Anthropic)
     ├─ 200 OK -> Stream Response & Log
     └─ 429/5xx Error -> Fallback to Upstream 2 (e.g. Groq/DeepSeek)
         ├─ 200 OK -> Stream Response & Log with `failover_occurred=true`
         └─ 429/5xx Error -> Fallback to Upstream 3 (e.g. Gemini)
```

---

## 6. Dashboard Interface (Anti-AI-Slop Experience)

1. **Global Navigation & Status Banner**:
   * Header with Real-time Gateway status ping indicator (Green = 99.98% Healthy).
   * Monospace latency counter across global edge regions (SIN, IAD, FRA, NRT).
2. **Dashboard Overview (The Command Center)**:
   * **Dual Rolling Quota Gauge Card**: Circular SVG ring showing remaining requests in the 5-hour window, active weekly token consumption, and a countdown timer for the next restored slot.
   * **Real-time Telemetry KPIs**: Requests per second (RPS), Average TTFT (ms), Cache Hit %, Error Rate.
   * **Live Stream Activity Waterfall**: Sparkline / mini bar chart showing request throughput over time.
3. **API Keys & Policy Control**:
   * Create/Revoke keys with prefixes (`mvx_live_...`).
   * Granular RPM limits, daily token ceilings, and allowed model toggles.
4. **Universal Failover & Routing Map**:
   * Interactive drag-and-drop / selector fallback priority tree.
   * Configure fallback rules: `Claude 3.7 -> DeepSeek V3 -> GPT-4o-mini`.
5. **Interactive SSE Streaming Playground**:
   * Model selector, prompt editor, system prompt input.
   * Real-time output stream with token-by-token speed counter (tokens/sec) and latency graph.
6. **Live Traces & Telemetry Inspector**:
   * High-density table with status pill badges (200 OK, 429 Rate Limit, 502 Bad Gateway), TTFT, model, duration, and full request-detail drawer.
7. **Team & Security Guardrails**:
   * Budget caps per member, PII regex masking toggle (hide emails/credit cards in prompts before proxying).

---

## 7. Verification & Testing Strategy

* **API Functional Tests**: Verify `/v1/messages` and `/v1/chat/completions` proxying, authentication error codes (401), rate limits (429), and failover execution.
* **Stream Integrity Tests**: Validate SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`), ensuring zero buffer delay.
* **Rolling Window Verification**: Unit test the 5-hour sliding window calculation to guarantee accurate recovery timings.
* **UI Responsiveness & Accessibility**: Tested across desktop and mobile with dark mode contrast compliance.
