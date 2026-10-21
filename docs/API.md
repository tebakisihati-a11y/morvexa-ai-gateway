# Morvexa AI Server Master — API Specification

**Base URL**: `/api`  
**Authentication**: `Authorization: Bearer <mvx_live_... | mvx_test_...>` (Client Gateway) atau `Bearer <CRON_SECRET | ADMIN_SECRET_KEY>` (Administrative Actions)  

---

## 1. Gateway Runtime Endpoints

### 1.1 Anthropic Compatible Messages
- **Endpoint**: `POST /api/v1/messages`
- **Headers**:
  - `Authorization: Bearer mvx_live_...`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "model": "claude-3-7-sonnet",
  "messages": [
    { "role": "user", "content": "Explain quantum computing briefly." }
  ],
  "system": "You are an expert AI tutor.",
  "temperature": 0.7,
  "stream": true
}
```
- **Response**: Server-Sent Events (SSE) `text/event-stream` atau JSON format pesan.
- **Failover**: Otomatis fallback ke `deepseek-chat` atau `groq` jika upstream Anthropic mengalami rate-limit (429) atau downtime.

---

### 1.2 OpenAI Compatible Chat Completions
- **Endpoint**: `POST /api/v1/chat/completions`
- **Headers**:
  - `Authorization: Bearer mvx_live_...`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Draft an API design review." }
  ],
  "temperature": 0.5
}
```
- **Response**: Format standar OpenAI JSON completion.

---

### 1.3 Verified Models Catalog
- **Endpoint**: `GET /api/v1/models`
- **Response**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-3-7-sonnet",
      "name": "Claude 3.7 Sonnet (Hybrid Reasoning)",
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kInput": 0.003,
      "costPer1kOutput": 0.015
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o (Omni)",
      "provider": "openai",
      "contextWindow": 128000,
      "costPer1kInput": 0.0025,
      "costPer1kOutput": 0.01
    }
  ]
}
```

---

### 1.4 Real-time System Metrics & Health Radar
- **Endpoint**: `GET /api/v1/metrics`
- **Response**: Uptime detik, RPS live, TTFT rata-rata, error rate, dan status latensi regional (Singapore, Frankfurt, Virginia, Tokyo).

---

## 2. Commerce & Financial Reconciliation

### 2.1 Checkout Session Creation
- **Endpoint**: `POST /api/billing/checkout`
- **Body**: `{ "planCode": "pro", "orgId": "org_123", "customerEmail": "user@example.com" }`
- **Proteksi**: Anti-tampering (harga divalidasi terhadap katalog harga server, bukan input client).

### 2.2 Midtrans Webhook Receiver
- **Endpoint**: `POST /api/billing/webhooks/midtrans`
- **Keamanan**: SHA-512 signature hash verification (`order_id + status_code + gross_amount + server_key`).

### 2.3 Automated Reconciliation Runner
- **Endpoint**: `POST /api/billing/reconcile` (Privileged: requires `CRON_SECRET` atau `ADMIN_SECRET_KEY`)
- **Fungsi**: Memindai pesanan menggantung, mendeteksi perbedaan status pembayaran gateway vs database, dan memperbarui status secara otomatis.

---

## 3. Operations & Hybrid Infrastructure

### 3.1 Owner Provider Credential Vault
- **Endpoint**: `GET /api/owner/providers`, `POST /api/owner/providers`, `DELETE /api/owner/providers/:provider`
- **Authentication**: sesi owner `HttpOnly` dan token CSRF untuk perubahan.
- **POST body**: `{ "provider": "openai", "apiKey": "<key dari provider>" }`
- **Penyimpanan**: ciphertext AES-256-GCM di Supabase; plaintext hanya dipakai selama request dan pemanggilan upstream. GET hanya mengembalikan status serta fingerprint mask.
- **Providers**: `anthropic`, `openai`, `deepseek`, `groq`, `gemini`.
- **Environment override**: environment variables server lebih diprioritaskan daripada vault.

### 3.2 Dedicated Environment Provisioning
- **Endpoint**: `POST /api/infrastructure/provision`
- **Body**: `{ "orgId": "org_abc", "planCode": "apex", "region": "sin" }`

### 3.3 Health Probes & Liveness
- **Endpoint**: `POST /api/infrastructure/environments/:envId/probe`
- **Fungsi**: Memperbarui status detak jantung cluster terisolasi.
