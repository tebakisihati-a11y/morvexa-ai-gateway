# Morvexa Nexus — Operational Incident Runbooks (Phase 8)

**Document:** `docs/operations/RUNBOOKS.md`  
**Version:** 1.0.0  
**Updated:** 2026-10-11  
**Status:** Approved for Production Operations  

---

## 1. Overview & Escalation Tiers

This document details standard operational procedures (SOPs) for resolving production incidents across the Morvexa AI Gateway, Midtrans Payment Processing, Hybrid Infrastructure, and Tenant Isolation systems.

| Tier | Role | Responsibilities | Target SLA |
|---|---|---|---|
| **Tier 1** | Support / DevOps On-Call | Gateway latency alerts, failed key lookups, webhook retry triggering | < 15 mins |
| **Tier 2** | Backend / Security Engineers | Payment reconciliation drifts, RLS bypass alerts, upstream API outages | < 30 mins |
| **Tier 3** | Principal Architect / Owner | Cryptographic key rotation, disaster recovery failover, DB migrations | < 60 mins |

---

## 2. Runbook: Midtrans Payment Webhook Outages & Reconciliation Drift

### Trigger Conditions
- Webhook failure alert or customer reports paid order still showing `pending`.
- `UNSETTLED_CAPTURE` or `AMOUNT_MISMATCH` detected during background reconciliation.

### Diagnostic Steps
1. **Query Reconciliation Audit Logs:**
   ```bash
   curl -X GET "https://morvexa-sistem.vercel.app/api/billing/reconcile/logs" \
     -H "Authorization: Bearer <ADMIN_BEARER_TOKEN>"
   ```
2. **Inspect Specific Order Status:**
   ```bash
   curl -X GET "https://morvexa-sistem.vercel.app/api/billing/orders/<ORDER_ID>"
   ```

### Remediation Steps
1. **Trigger Manual Automated Reconciliation Sweep:**
   ```bash
   curl -X POST "https://morvexa-sistem.vercel.app/api/cron/reconcile" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
2. **Force Single Order Settlement (Emergency):**
   ```bash
   curl -X POST "https://morvexa-sistem.vercel.app/api/billing/reconcile/<ORDER_ID>" \
     -H "Content-Type: application/json" \
     -d '{"mockGatewayStatus": "settlement"}'
   ```
3. Verify that subscription entitlement transitions from `pending_payment` to `active` and invoice `INV-...` is generated.

---

## 3. Runbook: AI Gateway Upstream Failover & Rate Limit Saturation

### Trigger Conditions
- HTTP 500/504 error rate spikes > 1% on `/api/v1/messages`.
- Anthropic or OpenAI API outage reported.

### Automatic Behavior
- Morvexa Smart Router automatically routes requests from exhausted upstream providers to healthy fallbacks (Anthropic Sonnet -> DeepSeek V3 / OpenAI GPT-4o / Local Dedicated Host `localhost:5002`).

### Manual Remediation Steps
1. **Check Live Regional Radar & Metrics:**
   ```bash
   curl -X GET "https://morvexa-sistem.vercel.app/api/v1/metrics"
   ```
2. **Switch Gateway Primary Routing Target:**
   - Open Nexus Control Plane (`/nexus` tab).
   - In **Provider Credentials & Routing Mesh**, de-prioritize or disable the degraded upstream provider.
   - Traffic immediately re-routes to healthy secondary nodes.

---

## 4. Runbook: Dedicated Local Daemon & Hybrid Infrastructure Issues

### Trigger Conditions
- Dedicated environment health probe fails 3 consecutive times (`status: "degraded"` or `"offline"`).

### Remediation Steps
1. **Verify Local Daemon Status:**
   ```bash
   curl -I http://localhost:5002/health
   ```
2. **Record Manual Health Probe (Force Online):**
   ```bash
   curl -X POST "https://morvexa-sistem.vercel.app/api/infrastructure/environments/<ENV_ID>/probe" \
     -H "Content-Type: application/json" \
     -d '{"success": true}'
   ```
3. **Deprovision or Redeploy Stalled Node:**
   ```bash
   curl -X DELETE "https://morvexa-sistem.vercel.app/api/infrastructure/environments/<ENV_ID>"
   ```

---

## 5. Runbook: Security Incident & API Key Emergency Revocation

### Trigger Conditions
- Compromised API key detected or leaked in client-side code.

### Remediation Steps
1. **Immediate Revocation via Store:**
   - In Customer Portal or Nexus Admin, toggle `isActive = false` on target key.
   - Gateway rejects subsequent requests within 0ms (in-memory lookup) and logs `status: "denied"` in Audit Trail.
2. **Verify Audit Trail:**
   ```bash
   curl -X GET "https://morvexa-sistem.vercel.app/api/audit/logs?action=API_KEY_REVOKED"
   ```
