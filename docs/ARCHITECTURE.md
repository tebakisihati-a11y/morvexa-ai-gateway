# Morvexa AI Server Master — System Architecture

**Version**: 2.0.0 (Master Modular Architecture)  
**Standard**: Modular Monolith with Portable Gateway Runtime  

---

## 1. High-Level Topology

```
+------------------------------------------------------------------------+
|                          EXPERIENCE LAYER                              |
|  [Public 3D Landing Page]      [Customer Portal]     [Admin Console]   |
|  - Hero 3D / WebGL Canvas      - API Key Mgmt        - Tenant Mgmt     |
|  - Model Catalog               - Quota & Billing     - Provider Health |
|  - Interactive Playground      - Trace Inspector     - Audit Logs      |
+-----------------------------------+------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|                      GATEWAY RUNTIME (Hono Edge)                       |
|   /api/v1/messages  |  /api/v1/chat/completions  |  /api/v1/models     |
|                                                                        |
|  [1. Ingress & CORS Guard] -> [2. Auth & SHA-256 Verifier]             |
|  [3. Token Bucket Rate Limiter] -> [4. Quota & Spending Check]         |
|  [5. Dynamic Model & Route Resolver]                                  |
|  [6. Provider Adapter Layer (Anthropic, OpenAI, DeepSeek, Gemini, etc)]|
|  [7. Zero-Buffer SSE Stream / Upstream Forwarding]                     |
|  [8. Audit & Telemetry Ingestion (Non-blocking)]                       |
+-----------------------------------+------------------------------------+
                                    |
          +-------------------------+-------------------------+
          v                                                   v
+-------------------------------+           +-------------------------------+
|     DATA & SECURITY LAYER     |           |       OPERATIONS LAYER        |
| - Supabase Postgres (RLS)     |           | - Cron Schedulers             |
| - AES-256-GCM Vault (BYOK)    |           | - Health Probing Daemon       |
| - Idempotent Billing Ledger   |           | - Midtrans Webhook Verifier   |
| - Audit Trail System          |           | - Reconciliation Engine       |
+-------------------------------+           +-------------------------------+
```

---

## 2. Core Layers & Modules

### 2.1 Experience Layer
- **Public Experience**: Landing page sinematik 3D dengan palet Obsidian `#010302`, Forest Green `#355C49`, Soft Mint White `#F0FEF8`, dan Neon Mint `#1CE172`. Menampilkan status live platform, transparansi pricing, dan katalog model terverifikasi.
- **Customer Portal**: Self-service API Key management, live streaming playground, audit trace viewer, dan billing sandbox/top-up.
- **Admin Control Plane**: Monitoring real-time rps, p95/p99 latency, status kesehatan upstream provider, failover routing policies, dan reconciliation dashboard.

### 2.2 Gateway Runtime
- Dibangun di atas **Hono** yang independen dari runtime node/vercel, memungkinkan portabilitas ke Cloudflare Workers, Fastly Compute, Docker Container, atau VPS jika diperlukan skala tinggi tanpa batasan serverless timeout.
- Memproses validasi token kriptografis, kuota rolling-window, dan multi-provider failover.

### 2.3 Provider Adapter Interface
Standar adapter untuk modularitas tanpa vendor lock-in:
```typescript
export interface ProviderAdapter {
  id: string;
  name: string;
  baseUrl: string;
  authenticate(credentials: ProviderCredentials): Promise<boolean>;
  forwardRequest(req: GatewayRequest): Promise<Response>;
  parseUsage(res: Response): Promise<UsageLedgerEntry>;
  healthCheck(): Promise<HealthStatus>;
}
```

### 2.4 Data Layer
- **Supabase Postgres** dengan Row-Level Security (RLS) terisolasi per tenant `organization_id`.
- Kredensial provider BYOK dienkripsi dengan format envelope encryption (AES-256-GCM) dengan key rotasi server-side.

---

## 3. Blast Radius & Change Management
- **Zero Breaking Changes**: Endpoint `/api/v1/*` dan `/api/billing/*` mempertahankan skema request/response 100% kompatibel.
- Seluruh penambahan model baru hanya memerlukan registrasi pada Model Registry tanpa mengubah core routing pipeline.
