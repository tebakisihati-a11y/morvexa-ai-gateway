# Morvexa Nexus — Financial Reconciliation & Audit Specification

**Document:** `docs/billing/RECONCILIATION.md`  
**Date:** 2026-10-10  
**Status:** Approved Billing Baseline (Phase 1)  
**Author:** Payment Integration & Financial Engineering Team  

---

## 1. Reconciliation Architecture & Purpose

Financial reconciliation acts as the safety net for the Morvexa billing engine. It guarantees that discrepancies between external payment gateway ledgers and internal Morvexa subscription entitlements are systematically identified, logged, and resolved.

Reconciliation targets four distinct failure modes:
1. **Missed Webhooks:** A customer completes payment, but network failures or serverless cold starts prevented webhook ingestion.
2. **Delayed Webhooks:** Bank settlements (e.g. BCA Virtual Account batch processing at 23:00) arriving hours after customer initiation.
3. **Amount or Currency Mismatches:** Discrepancies between expected checkout amount and actual captured settlement.
4. **Orphaned Recurring Charges:** External subscription renewing automatically when the customer canceled in the portal, or vice versa.

---

## 2. Automated Reconciliation Engine

A scheduled background job executes every 15 minutes:

```
[ Scheduled Reconciliation Job (Every 15m) ]
                     │
                     ▼
[ 1. Query pending transactions older than 10 minutes ]
  WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes'
                     │
                     ▼
[ 2. Call Payment Gateway Status API (Midtrans / Xendit) ]
  GET /v2/{order_id}/status
                     │
                     ▼
+────────────────────┴────────────────────+
│ Match Status with Gateway Response      │
+────────────────────┬────────────────────+
                     │
        +────────────┼────────────+
        │            │            │
        │ Settled    │ Expired    │ Amount Mismatch / Anomaly
        ▼            ▼            ▼
+───────────────+ +─────────────+ +─────────────────────────+
| 3. Settle &   | | 4. Mark     | | 5. Log Discrepancy in   |
| Activate Sub  | | Expired     | | reconciliation_records  |
+───────────────+ +─────────────+ +─────────────────────────+
                                                │
                                                ▼
                                  [ 6. Alert Nexus Admin    ]
                                  [ for Manual Review       ]
```

---

## 3. Discrepancy Classification

| Discrepancy Code | Description | Severity | Automated Action | Manual Action |
|---|---|---|---|---|
| `UNSETTLED_CAPTURE` | Gateway reports `settlement`, Morvexa shows `pending`. | Medium | Settle transaction, activate subscription, record log. | None (auto-resolved). |
| `AMOUNT_MISMATCH` | Gateway settled amount differs from `checkout_sessions.amount`. | Critical | **DO NOT AUTO-ACTIVATE**. Flag for fraud investigation. | Finance admin inspects bank record. |
| `ORPHAN_TRANSACTION` | Gateway reports transaction with no matching `order_id` in Morvexa. | High | Ingest into unlinked reconciliation queue. | Match with customer account manually. |
| `RECURRING_DRIFT` | Provider subscription renewed, but Morvexa subscription canceled. | High | Extend subscription period to match paid window. | Contact customer regarding cancellation status. |

---

## 4. Manual Review & Controlled Refund Workflow

In the **Nexus Admin Console** (`/nexus/reconciliation`):
1. **Discrepancy Inspector:** Finance admins view all unresolved discrepancies with external transaction IDs, raw provider JSON payloads, and timestamps.
2. **One-Click Synchronization:** Operator can trigger an authoritative pull directly from the payment gateway to reconcile a disputed account in real time.
3. **Controlled Refunds:**
   - Initiated only by users with role `FINANCE_ADMIN` or `PLATFORM_OWNER`.
   - Requires audit reason and idempotency token.
   - Dispatches refund request to payment provider API, updates transaction to `REFUNDED`, records debit entry in `financial_ledger_entries`, and adjusts customer entitlement expiration.
