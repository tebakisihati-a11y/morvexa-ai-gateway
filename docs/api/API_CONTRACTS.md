# Morvexa Nexus — API & Integration Contracts

**Document:** `docs/api/API_CONTRACTS.md`  
**Date:** 2026-10-10  
**Status:** Approved API Baseline (Phase 1)  
**Standard:** RESTful JSON, HTTP Status Codes, RFC 7807 Problem Details  

---

## 1. Global Request & Response Envelopes

### A. Standard Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "correlation_id": "req_mvx_7f9a2b1c4d",
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

### B. Standard Paginated Response Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "has_more": true
  },
  "correlation_id": "req_mvx_7f9a2b1c4d",
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

### C. Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The provided API key has been revoked or expired.",
    "details": null
  },
  "correlation_id": "req_mvx_7f9a2b1c4d",
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

---

## 2. Core API Endpoints

### 2.1 Identity, Organizations & Projects

#### `GET /api/account`
- **Auth:** Session Cookie (Supabase Auth)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_99a8b7c6",
      "email": "developer@morvexa.com",
      "full_name": "Antigravity Dev",
      "active_org_id": "org_11223344",
      "role": "customer_owner",
      "is_suspended": false
    }
  }
  ```

#### `GET /api/organizations`
- **Auth:** Session Cookie
- **Response:** Returns list of organizations the user is a member of with their respective roles.

#### `POST /api/organizations`
- **Auth:** Session Cookie
- **Request Body:** `{ "name": "Acme AI Corp", "slug": "acme-ai" }`
- **Response:** Created organization profile; caller becomes `customer_owner`.

#### `GET /api/projects`
- **Auth:** Session Cookie + Active Org
- **Query Params:** `?limit=20&page=1`
- **Response:** Returns list of projects grouped under active organization.

---

### 2.2 Catalog, Subscriptions & Billing

#### `GET /api/plans`
- **Auth:** Public / Anonymous
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "plan_starter",
        "slug": "starter",
        "name": "Starter Plan",
        "description": "For individual developers and small prototypes",
        "versions": [
          {
            "id": "pv_starter_monthly",
            "billing_period": "monthly",
            "price_amount": 250000.00,
            "currency": "IDR",
            "standard_req_5h_limit": 100,
            "standard_req_7d_limit": 1000,
            "latest_token_daily_limit": 150000,
            "rate_limit_rpm": 60,
            "dedicated_eligible": false
          }
        ]
      }
    ]
  }
  ```

#### `POST /api/checkout`
- **Auth:** Session Cookie (`customer_owner`)
- **Request Body:**
  ```json
  {
    "plan_version_id": "pv_pro_monthly",
    "provider": "midtrans"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "checkout_session_id": "cs_99182736",
      "payment_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/12345",
      "snap_token": "snap_tok_abc123xyz",
      "amount": 750000.00,
      "currency": "IDR",
      "expires_at": "2026-10-10T14:00:00.000Z"
    }
  }
  ```

#### `POST /api/billing/webhooks/:provider`
- **Auth:** Provider-specific Cryptographic Signature Header (e.g. Midtrans `signature_key` or Xendit `x-callback-token`)
- **Headers:** `X-Callback-Token` or raw payload signature
- **Behavior:**
  1. Validates signature against provider secret key.
  2. Persists into `payment_webhook_events` with idempotency constraint.
  3. Updates transaction status to `settled`.
  4. Activates subscription and grants entitlements.
- **Response:** `200 OK` `{ "received": true }`

#### `GET /api/billing/transactions`
- **Auth:** Session Cookie
- **Query Params:** `?page=1&limit=20&status=settled`
- **Response:** Paginated list of payment transactions with receipt URLs.

#### `GET /api/billing/invoices`
- **Auth:** Session Cookie
- **Response:** Returns historical invoices with downloadable representations.

---

### 2.3 API Keys & Edge AI Gateway

#### `POST /api/api-keys`
- **Auth:** Session Cookie (`customer_owner` or `customer_developer`)
- **Request Body:**
  ```json
  {
    "name": "Production Agent",
    "project_id": "prj_9182",
    "rate_limit_rpm": 120,
    "daily_token_limit": 500000
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "key_11223344",
      "name": "Production Agent",
      "key_prefix": "mvx_live_",
      "masked_key": "mvx_live_...4f89",
      "raw_secret": "mvx_live_d8a1c92ef03b47e81290384756192837",
      "rate_limit_rpm": 120,
      "daily_token_limit": 500000,
      "created_at": "2026-10-10T12:00:00.000Z"
    }
  }
  ```
  *(Note: `raw_secret` is returned exactly once in the creation response and never stored in plaintext).*

#### `DELETE /api/api-keys/:id`
- **Auth:** Session Cookie (`customer_owner`)
- **Response:** `200 OK` `{ "revoked": true }`

#### `POST /api/v1/messages` (AI Gateway - Anthropic Protocol)
- **Auth:** `Authorization: Bearer mvx_live_<secret>`
- **Request Body:**
  ```json
  {
    "model": "claude-3-7-sonnet",
    "stream": true,
    "messages": [{ "role": "user", "content": "Explain quantum computing" }]
  }
  ```
- **Headers Returned:**
  - `Content-Type: text/event-stream; charset=utf-8`
  - `X-Morvexa-Provider: anthropic`
  - `X-Morvexa-Failover: false`
  - `X-Morvexa-Remaining-5h: 94`

---

### 2.4 Infrastructure Operations

#### `GET /api/infrastructure/environments`
- **Auth:** Session Cookie
- **Response:** Lists active environments (shared edge proxy or dedicated isolated nodes).

#### `POST /api/infrastructure/provisioning-requests`
- **Auth:** Session Cookie (`CUSTOMER_OWNER` with Enterprise subscription)
- **Request Body:**
  ```json
  {
    "mode": "dedicated",
    "region": "sin-01",
    "name": "Acme Private Cluster"
  }
  ```
- **Response (202 Accepted):** Returns `provisioning_job_id` tracking status progression.

---

### 2.5 Nexus Admin Control Plane

#### `GET /api/admin/overview`
- **Auth:** Session Cookie (`PLATFORM_OWNER` or `SUPER_ADMIN`)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "registered_users": 1284,
      "active_organizations": 340,
      "active_subscriptions": 218,
      "gross_collections_idr": 184500000.00,
      "gross_margin_estimate": 0.68,
      "api_requests_24h": 412900,
      "error_rate": 0.0012,
      "unresolved_alerts": 0
    }
  }
  ```
