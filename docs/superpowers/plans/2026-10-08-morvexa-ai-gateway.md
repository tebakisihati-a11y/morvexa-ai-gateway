# Morvexa AI Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Morvexa AI Gateway, an ultra-fast, developer-first AI proxy and observability hub with Next.js 15, Hono.js Edge Router, Supabase, Tailwind CSS v4, and an anti-AI-slop high-density dashboard.

**Architecture:** A unified Next.js 15 App Router application embedding Hono.js Edge routes for high-performance proxying (`/v1/messages`, `/v1/chat/completions`), coupled with a modular Supabase data layer and a dense Linear/Vercel-inspired dark engineering dashboard featuring live SSE streaming and dual rolling quota gauges.

**Tech Stack:** Next.js 15, React 19, Hono.js, Tailwind CSS v4, Lucide React, Supabase JS, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-morvexa-ai-gateway-design.md`

## Global Constraints
- Next.js 15 App Router with TypeScript strict mode.
- Tailwind CSS v4 `@theme` inline CSS token system without bloated UI libraries.
- Hono embedded edge router inside `app/api/[[...route]]/route.ts`.
- Zero AI-slop visual design: strictly high-density, dark mode monospace telemetry, subtle borders (`border-white/10`), precise real metrics.
- 100% Free deployment compatibility: Vercel Hobby tier + Supabase free tier.

## Review Focus
1. Rolling quota TTL expiration calculation: Ensure expired requests outside the 5-hour window are excluded from current count and restore slots accurately.
2. Zero-buffer SSE stream transformer: Ensure the stream passes chunks immediately to client without buffering delays while correctly recording TTFT.
3. Failover error propagation: When all upstreams return errors, return a clean Anthropic/OpenAI compliant JSON error object with proper status code (502/429).
4. Edge runtime compatibility: No Node.js-only native binaries used in the Hono edge routes.
5. Key verification security: API key secret is compared using SHA-256 hash, never storing plaintext keys.

---

### Task 1: Next.js 15 Scaffolding & Tailwind CSS v4 Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Interfaces:**
- Produces: Base Next.js 15 runtime, Tailwind CSS v4 styling tokens, and layout shell.

- [ ] **Step 1: Create package.json and project configuration**
  Setup `package.json` with dependencies: `next@15.2.1`, `react@19.0.0`, `react-dom@19.0.0`, `hono@^4.7.2`, `@hono/node-server`, `lucide-react@^1.16.0`, `@supabase/supabase-js@^2.49.1`, `clsx`, `tailwind-merge`, and dev dependencies: `tailwindcss@^4.0.9`, `@tailwindcss/postcss@^4.0.9`, `typescript`, `@types/node`, `@types/react`, `vitest`.

- [ ] **Step 2: Run npm install**
  Run: `npm install`
  Expected: Dependencies successfully installed.

- [ ] **Step 3: Setup tsconfig.json, next.config.ts, and Tailwind CSS v4 globals.css**
  Configure `@theme` variables for deep dark console aesthetics (`--color-background: #09090b`, `--color-card: #111113`, `--color-border: #27272a`, `--color-primary: #f97316` / modern amber-orange accent).

- [ ] **Step 4: Verify build works**
  Run: `npm run build` or `npx next build`
  Expected: Successful compilation of Next.js app.

- [ ] **Step 5: Commit**
  ```bash
  git add .
  git commit -m "chore: scaffold Next.js 15 with Tailwind CSS v4 and TypeScript"
  ```

---

### Task 2: Core Data Types & Dual Rolling Quota Engine

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/quota.ts`
- Create: `tests/quota.test.ts`

**Interfaces:**
- Produces: `calculateRollingQuotaStatus(records: QuotaRecord[], config: QuotaConfig): QuotaStatus`
- Produces: `formatTimeRemaining(ms: number): string`

- [ ] **Step 1: Write the failing test for dual rolling quota**
  Create `tests/quota.test.ts` testing 5-hour rolling request window recovery, slot countdown timer, and 7-day token cap calculation.

- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run tests/quota.test.ts`
  Expected: FAIL with module/function not found.

- [ ] **Step 3: Implement `src/lib/types.ts` and `src/lib/quota.ts`**
  Implement `calculateRollingQuotaStatus` using 5-hour TTL filter (`now - record.createdAt < 5 * 3600 * 1000`) and calculate the exact time until the oldest active slot drops off.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/quota.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/types.ts src/lib/quota.ts tests/quota.test.ts
  git commit -m "feat(quota): implement dual rolling quota calculation engine with tests"
  ```

---

### Task 3: Hono.js Edge Gateway Router & Proxy Engine

**Files:**
- Create: `src/lib/gateway/auth.ts`
- Create: `src/lib/gateway/failover.ts`
- Create: `src/lib/gateway/stream.ts`
- Create: `src/app/api/[[...route]]/route.ts`
- Create: `tests/gateway.test.ts`

**Interfaces:**
- Consumes: `QuotaConfig`, `QuotaRecord` from `src/lib/quota.ts`
- Produces: Hono App serving `POST /api/v1/messages`, `POST /api/v1/chat/completions`, `GET /api/v1/models`, `GET /api/v1/metrics`

- [ ] **Step 1: Write the failing gateway test**
  Create `tests/gateway.test.ts` verifying API key authentication, model routing, and SSE streaming responses.

- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run tests/gateway.test.ts`
  Expected: FAIL

- [ ] **Step 3: Implement Hono Edge Gateway router & failover handlers**
  Implement Hono app with route handlers in `src/app/api/[[...route]]/route.ts` utilizing zero-buffer Web Streams API (`TransformStream`) for SSE and multi-provider fallback.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/gateway.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/gateway/ src/app/api/ tests/gateway.test.ts
  git commit -m "feat(gateway): implement Hono edge proxy router with SSE streaming & failover"
  ```

---

### Task 4: Supabase Database Layer & Mock Fallback Store

**Files:**
- Create: `supabase/migrations/20261008_init.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/store.ts`

**Interfaces:**
- Produces: `getApiKeys()`, `createApiKey()`, `revokeApiKey()`, `getRequestLogs()`, `getRollingQuotaData()`
- Produces: In-memory/localStorage mock store that automatically seeds demo data when Supabase credentials are not yet configured.

- [ ] **Step 1: Create Supabase SQL migration script**
  Write `supabase/migrations/20261008_init.sql` containing tables: `organizations`, `profiles`, `api_keys`, `upstream_credentials`, `rolling_quota_records`, and `request_logs`.

- [ ] **Step 2: Implement Supabase client & resilient storage adapter**
  Implement `src/lib/supabase/store.ts` with transparent fallback to interactive memory/storage so the webapp works out-of-the-box locally and on preview deployments.

- [ ] **Step 3: Test store functions**
  Verify API key creation and quota tracking functions return expected records.

- [ ] **Step 4: Commit**
  ```bash
  git add supabase/ src/lib/supabase/
  git commit -m "feat(db): add Supabase migration schema and resilient data store"
  ```

---

### Task 5: Anti-AI-Slop Shell & High-Density Dashboard Layout

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/EdgeStatusRadar.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: High-density console layout with global edge latency ticker, real-time health indicator, and navigation tabs.

- [ ] **Step 1: Implement EdgeStatusRadar component**
  Build a live ping component showing regional edge latencies (Singapore, Frankfurt, Virginia, Tokyo) with sub-millisecond precision and pulse status indicator.

- [ ] **Step 2: Implement Sidebar and Navigation Bar**
  Build clean Linear-style navigation tabs: Overview, API Keys, Model Router, Playground, Traces, Guardrails.

- [ ] **Step 3: Integrate into layout.tsx and test responsiveness**
  Run dev server and verify visual fidelity on desktop and mobile.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/layout/ src/app/layout.tsx src/app/page.tsx
  git commit -m "feat(ui): add high-density console shell and live edge status radar"
  ```

---

### Task 6: Overview Command Center & Dual Rolling Quota Live Visualizer

**Files:**
- Create: `src/components/dashboard/DualQuotaCard.tsx`
- Create: `src/components/dashboard/TelemetryMetrics.tsx`
- Create: `src/components/dashboard/ThroughputChart.tsx`
- Create: `src/components/dashboard/OverviewTab.tsx`

**Interfaces:**
- Consumes: `calculateRollingQuotaStatus` from `src/lib/quota.ts`
- Produces: Dual Rolling Quota card with circular SVG gauge, countdown recovery timer, and real-time KPI cards (RPS, TTFT, Cache Hit %, Error Rate).

- [ ] **Step 1: Implement DualQuotaCard with animated SVG gauge and countdown**
  Render visual 5-hour rolling request quota ring and weekly token cap progress bar with dynamic countdown ("Restores +1 slot in mm:ss").

- [ ] **Step 2: Implement TelemetryMetrics & ThroughputChart**
  Render KPI metric cards with monospace numbers (`Geist Mono`) and sparkline throughput histogram.

- [ ] **Step 3: Assemble into OverviewTab and verify live updates**
  Verify countdown timer decrements every second and reacts to simulated requests.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/dashboard/
  git commit -m "feat(dashboard): implement dual rolling quota gauge and live telemetry KPIs"
  ```

---

### Task 7: API Key Management & Policy Controller

**Files:**
- Create: `src/components/keys/ApiKeyList.tsx`
- Create: `src/components/keys/CreateKeyModal.tsx`
- Create: `src/components/keys/KeysTab.tsx`

**Interfaces:**
- Consumes: `getApiKeys()`, `createApiKey()`, `revokeApiKey()` from `src/lib/supabase/store.ts`
- Produces: Key generation modal, secret key copy-once notification, RPM rate-limiting config, and active key list.

- [ ] **Step 1: Implement CreateKeyModal with prefix `mvx_live_...`**
  Generate secure cryptographically random keys, calculate SHA-256 hash, and allow setting custom RPM / token caps.

- [ ] **Step 2: Implement ApiKeyList with revoke, copy, and usage metrics**
  Display high-density key table with status badge, last active timestamp, and quick-action menu.

- [ ] **Step 3: Test key generation and persistence in UI**
  Create a new key and verify it appears in table with proper masking (`mvx_live_...a8f2`).

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/keys/
  git commit -m "feat(keys): add API key generator and rate-limiting policy manager"
  ```

---

### Task 8: Universal Model Routing & Failover Visualizer

**Files:**
- Create: `src/components/routing/ProviderCredentialsCard.tsx`
- Create: `src/components/routing/FailoverFlowMap.tsx`
- Create: `src/components/routing/RoutingTab.tsx`

**Interfaces:**
- Produces: Interactive visual fallback routing tree (Primary -> Fallback 1 -> Fallback 2) and upstream provider API key input cards.

- [ ] **Step 1: Implement ProviderCredentialsCard**
  Allow user to register upstream keys (Anthropic, OpenAI, Gemini, Groq, DeepSeek) with encrypted storage.

- [ ] **Step 2: Implement FailoverFlowMap**
  Build a visual node pipeline showing fallback sequence with live provider status indicators and latency badges.

- [ ] **Step 3: Verify fallback configuration changes**
  Test reordering priority and switching fallback targets.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/routing/
  git commit -m "feat(routing): implement universal multi-provider failover pipeline"
  ```

---

### Task 9: Interactive SSE Streaming Playground

**Files:**
- Create: `src/components/playground/PlaygroundTab.tsx`
- Create: `src/components/playground/StreamInspector.tsx`

**Interfaces:**
- Consumes: Gateway endpoints (`/api/v1/messages` and `/api/v1/chat/completions`)
- Produces: Real-time playground with SSE streaming playback, token velocity meter (tokens/sec), and TTFT latency graph.

- [ ] **Step 1: Build playground controls (model, temperature, system prompt, user prompt)**
  Support Anthropic Claude (3.7 Sonnet, 3.5 Haiku) and OpenAI/DeepSeek models.

- [ ] **Step 2: Implement live SSE stream receiver and chunk inspector**
  Use `ReadableStreamDefaultReader` to stream tokens in real-time, measure TTFT accurately, and display chunk velocity.

- [ ] **Step 3: Test streaming execution**
  Send a test prompt and verify tokens render chunk-by-chunk with zero buffer delay.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/playground/
  git commit -m "feat(playground): add interactive SSE streaming playground with TTFT gauge"
  ```

---

### Task 10: Live Request Tracing & Telemetry Inspector

**Files:**
- Create: `src/components/traces/TracesTable.tsx`
- Create: `src/components/traces/TraceDetailDrawer.tsx`
- Create: `src/components/traces/TracesTab.tsx`

**Interfaces:**
- Consumes: `getRequestLogs()` from `src/lib/supabase/store.ts`
- Produces: Searchable log stream with status code badges (200, 429, 502), filter by model, duration latency breakdown, and payload inspector.

- [ ] **Step 1: Build TracesTable with real-time log ingestion**
  Render table with Status, Endpoint, Model, Duration, TTFT, Tokens, and Failover flag.

- [ ] **Step 2: Build TraceDetailDrawer**
  Render slide-over panel showing request headers, failover hops, and response payload.

- [ ] **Step 3: Verify log filtering and drawer inspection**
  Filter by error status and open trace details.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/traces/
  git commit -m "feat(traces): add real-time request tracing and log inspector drawer"
  ```

---

### Task 11: Team Guardrails & Free Hosting Deployment Guide

**Files:**
- Create: `src/components/guardrails/GuardrailsTab.tsx`
- Create: `docs/DEPLOYMENT_GUIDE.md`
- Create: `README.md`

**Interfaces:**
- Produces: Enterprise guardrail toggles (PII masking, prompt cache, budget limits) and complete zero-cost deployment manual for Vercel + Supabase + Free Domain (`is-a.dev`).

- [ ] **Step 1: Implement GuardrailsTab**
  Add toggles for PII Data Masking, Semantic Prompt Caching, and Team Monthly Budget caps.

- [ ] **Step 2: Write DEPLOYMENT_GUIDE.md and comprehensive README.md**
  Detail exact step-by-step instructions for:
  1. Free Vercel deployment with zero configuration.
  2. Free Supabase database and auth setup.
  3. Free custom subdomain setup (`is-a.dev` or `js.org`).

- [ ] **Step 3: Run complete test suite and production build**
  Run: `npm test && npm run build`
  Expected: All unit tests pass and build succeeds with zero errors.

- [ ] **Step 4: Final commit**
  ```bash
  git add .
  git commit -m "feat(deploy): add guardrails tab, deployment guide, and complete documentation"
  ```
