# Morvexa Nexus — Payment Lifecycle & Gateway Specifications

**Document:** `docs/billing/PAYMENT_LIFECYCLE.md`  
**Date:** 2026-10-10  
**Status:** Approved Billing Baseline (Phase 1)  
**Author:** Payment Integration & Financial Engineering Team  
**Focus Providers:** Midtrans (Snap/Core), Xendit (Invoice), Stripe (Fallback)  

---

## 1. Transaction Finite State Machine

```
                   Customer Initiates Checkout
                               │
                               ▼
                        +--------------+
                        |   PENDING    |
                        +-------+------+
                                │
        +───────────────────────┼───────────────────────+
        │                       │                       │
        │ Payment Settled       │ Window Closes         │ Bank / Gateway Rejection
        ▼                       ▼                       ▼
+---------------+       +---------------+       +---------------+
|    SETTLED    |       |    EXPIRED    |       |    FAILED     |
+-------+-------+       +---------------+       +---------------+
        │
        +───────────────────────+
        │                       │
        │ Approved Refund       │ Chargeback / Dispute
        ▼                       ▼
+---------------+       +---------------+
|   REFUNDED    |       |   DISPUTED    |
+---------------+       +---------------+
```

### State Definitions:
- **`PENDING`:** Order created, awaiting customer completion via QRIS, Virtual Account, Credit Card, or E-Wallet. Entitlements are NOT granted.
- **`SETTLED`:** Authoritative confirmation received from the payment provider with verified cryptographic signature. Entitlements are activated, invoice is marked paid.
- **`EXPIRED`:** Customer did not complete payment within the payment window (typically 24 hours for Virtual Account, 15 minutes for QRIS).
- **`FAILED`:** Bank declined the transaction or insufficient funds.
- **`REFUNDED`:** Operator approved a partial or full refund. Recorded in `refunds` table and double-entry ledger.
- **`DISPUTED`:** Disputed payment; puts subscription into grace period pending manual operator arbitration.

---

## 2. Indonesian Payment Providers: Technical Evaluation

### Provider Option A: Midtrans (Recommended Primary)
- **Supported Payment Methods:**
  - **QRIS:** GoPay, OVO, ShopeePay, Dana, LinkAja, and any Indonesian mobile banking app (BCA Mobile, Livin' Mandiri, BRImo).
  - **Virtual Accounts:** BCA, Mandiri, BNI, BRI, Permata.
  - **Cards:** Visa, Mastercard, JCB with 3D-Secure authentication.
  - **Convenience Stores:** Indomaret, Alfamart.
- **Webhook Authentication:**
  Midtrans delivers HTTP POST callbacks containing signature key:
  $$\text{Signature} = \text{SHA-512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{ServerKey})$$
  The Morvexa backend recalculates this digest; if mismatched, request is rejected with `401 Unauthorized`.
- **Status Mapping:**
  - `settlement` or `capture` (with `fraud_status: accept`) ➔ `SETTLED`
  - `pending` ➔ `PENDING`
  - `expire` ➔ `EXPIRED`
  - `cancel` / `deny` ➔ `FAILED`

### Provider Option B: Xendit
- **Supported Payment Methods:**
  - Dynamic QRIS, XenPlatform, Virtual Accounts, Credit Cards, E-Wallets.
- **Webhook Authentication:**
  Header `x-callback-token` compared against configured secret token.
- **Status Mapping:**
  - `PAID` ➔ `SETTLED`
  - `EXPIRED` ➔ `EXPIRED`

---

## 3. Idempotency & Webhook Protection Rules

1. **Replay Defense:**
   Every incoming webhook payload is recorded into `payment_webhook_events`:
   ```sql
   INSERT INTO payment_webhook_events (provider, event_id, event_type, signature, payload)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (provider, event_id) DO NOTHING
   RETURNING id;
   ```
   If no row is returned, the event has already been ingested. The route returns HTTP 200 immediately without reprocessing.
2. **Out-of-Order Delivery Protection:**
   Under high traffic or provider retries, an older `pending` notification may arrive after a `settled` notification.
   - **Rule:** A transaction in state `SETTLED` can **never** transition back to `PENDING` or `EXPIRED`.
   - Update queries strictly enforce monotonic state advancement:
     ```sql
     UPDATE payment_transactions
     SET status = 'settled', settled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status != 'settled';
     ```
3. **Zero Trust on Browser Redirects:**
   The frontend redirect URL (`/portal/billing/success?order_id=...`) simply triggers a polling query against `/api/billing/transactions/:id` to check whether the authoritative webhook has settled. The client redirect is NEVER treated as proof of payment.
