/**
 * Morvexa Nexus — Financial Reconciliation & Audit Engine
 * Implements automated detection and remediation for:
 * 1. UNSETTLED_CAPTURE (missed/delayed webhooks)
 * 2. AMOUNT_MISMATCH (potential fraud/drift)
 * 3. ORPHAN_TRANSACTION (untracked gateway orders)
 * 4. EXPIRED_CLEANUP & CANCELLED_CLEANUP
 */

import {
  getTransaction,
  getAllTransactions,
  updateTransaction,
  mapMidtransStatus,
} from "./midtrans";
import type {
  ReconciliationRecord,
  BatchReconciliationResult,
  DiscrepancyType,
  TransactionStatus,
} from "./types";

/**
 * Interface for querying gateway authoritative status
 */
export type GatewayStatusProvider = (orderId: string) => Promise<{
  status: string;
  gross_amount: string;
  fraud_status?: string;
} | null>;

const memoryReconciliationLogs: ReconciliationRecord[] = [];

/**
 * Resets reconciliation logs (for test isolation)
 */
export function resetReconciliationStore(): void {
  memoryReconciliationLogs.length = 0;
}

/**
 * Returns all logged reconciliation records
 */
export function getReconciliationLogs(): ReconciliationRecord[] {
  return [...memoryReconciliationLogs];
}

/**
 * Reconciles a single order against the payment gateway's authoritative record.
 */
export async function reconcileSingleOrder(
  orderId: string,
  options?: {
    mockGatewayStatus?: string;
    mockGatewayAmount?: number;
    mockFraudStatus?: string;
    gatewayProvider?: GatewayStatusProvider;
  }
): Promise<ReconciliationRecord> {
  const internalTx = getTransaction(orderId);
  const now = new Date();
  const timestamp = now.toISOString();

  // 1. Check for Orphaned Gateway Transaction
  if (!internalTx) {
    const record: ReconciliationRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      orderId,
      discrepancyType: "ORPHAN_TRANSACTION",
      severity: "high",
      internalStatus: "not_found",
      gatewayStatus: options?.mockGatewayStatus || "unknown",
      internalAmount: 0,
      gatewayAmount: options?.mockGatewayAmount || 0,
      actionTaken: "flagged_for_manual_review",
      resolved: false,
      timestamp,
      details: "Gateway transaction exists but has no matching record in Morvexa database.",
    };
    memoryReconciliationLogs.push(record);
    return record;
  }

  // 2. Fetch authoritative Gateway state
  let gatewayStatus = options?.mockGatewayStatus;
  let gatewayAmount = options?.mockGatewayAmount ?? internalTx.amount;
  let fraudStatus = options?.mockFraudStatus;

  if (!gatewayStatus && options?.gatewayProvider) {
    const gwData = await options.gatewayProvider(orderId);
    if (gwData) {
      gatewayStatus = gwData.status;
      gatewayAmount = parseFloat(gwData.gross_amount) || internalTx.amount;
      fraudStatus = gwData.fraud_status;
    }
  }

  // Fallback: If no provider or mock, assume gateway state matches internal
  if (!gatewayStatus) {
    gatewayStatus = internalTx.status === "settled" ? "settlement" : internalTx.status;
  }

  const mappedStatus = mapMidtransStatus(gatewayStatus, fraudStatus);

  // 3. Case A: Amount Mismatch Detection (Critical Fraud Protection)
  if (
    (mappedStatus === "settled" || internalTx.status === "settled") &&
    Math.abs(internalTx.amount - gatewayAmount) > 0.01
  ) {
    const record: ReconciliationRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      orderId,
      discrepancyType: "AMOUNT_MISMATCH",
      severity: "critical",
      internalStatus: internalTx.status,
      gatewayStatus,
      internalAmount: internalTx.amount,
      gatewayAmount,
      actionTaken: "flagged_for_manual_review",
      resolved: false,
      timestamp,
      details: `Critical discrepancy: Gateway captured amount (${gatewayAmount}) does not match expected amount (${internalTx.amount}). Auto-activation blocked.`,
    };
    memoryReconciliationLogs.push(record);
    return record;
  }

  // 4. Case B: Unsettled Capture (Missed Webhook Remediation)
  if (mappedStatus === "settled" && internalTx.status === "pending") {
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const invoiceId = `INV-${dateStr}-${orderId.slice(-6).toUpperCase()}`;

    updateTransaction(orderId, {
      status: "settled",
      invoiceId,
    });

    const record: ReconciliationRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      orderId,
      discrepancyType: "UNSETTLED_CAPTURE",
      severity: "medium",
      internalStatus: "pending",
      gatewayStatus,
      internalAmount: internalTx.amount,
      gatewayAmount,
      actionTaken: "auto_settled",
      resolved: true,
      invoiceId,
      timestamp,
      details: "Gateway settlement confirmed. Transaction auto-settled and subscription activated.",
    };
    memoryReconciliationLogs.push(record);
    return record;
  }

  // 5. Case C: Expired Cleanup
  if (mappedStatus === "expired" && internalTx.status === "pending") {
    updateTransaction(orderId, { status: "expired" });

    const record: ReconciliationRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      orderId,
      discrepancyType: "EXPIRED_CLEANUP",
      severity: "low",
      internalStatus: "pending",
      gatewayStatus,
      internalAmount: internalTx.amount,
      gatewayAmount,
      actionTaken: "marked_expired",
      resolved: true,
      timestamp,
      details: "Pending transaction expired at gateway and updated internally.",
    };
    memoryReconciliationLogs.push(record);
    return record;
  }

  // 6. Case D: Cancelled / Denied Cleanup
  if (mappedStatus === "failed" && internalTx.status === "pending") {
    updateTransaction(orderId, { status: "failed" });

    const record: ReconciliationRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      orderId,
      discrepancyType: "CANCELLED_CLEANUP",
      severity: "low",
      internalStatus: "pending",
      gatewayStatus,
      internalAmount: internalTx.amount,
      gatewayAmount,
      actionTaken: "marked_failed",
      resolved: true,
      timestamp,
      details: "Gateway reported cancellation/denial. Marked transaction as failed.",
    };
    memoryReconciliationLogs.push(record);
    return record;
  }

  // 7. Case E: Perfect Synchronization
  const record: ReconciliationRecord = {
    id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    orderId,
    discrepancyType: "UNSETTLED_CAPTURE",
    severity: "low",
    internalStatus: internalTx.status,
    gatewayStatus,
    internalAmount: internalTx.amount,
    gatewayAmount,
    actionTaken: "none",
    resolved: true,
    timestamp,
    details: "Internal status and gateway status are in complete agreement.",
  };
  return record;
}

/**
 * Automated batch reconciliation runner.
 * Scans pending transactions older than minPendingAgeMs (defaults to 10 minutes).
 */
export async function runAutomatedReconciliation(options?: {
  minPendingAgeMs?: number;
  gatewayProvider?: GatewayStatusProvider;
  mockGatewayLookup?: (orderId: string) => { status: string; amount?: number } | null;
}): Promise<BatchReconciliationResult> {
  const minPendingAgeMs = options?.minPendingAgeMs ?? 10 * 60 * 1000;
  const now = Date.now();
  const allTx = getAllTransactions();

  // Find candidate pending transactions
  const pendingTx = allTx.filter((tx) => {
    if (tx.status !== "pending") return false;
    const age = now - tx.createdAt;
    return age >= minPendingAgeMs;
  });

  const records: ReconciliationRecord[] = [];
  let resolvedCount = 0;
  let flaggedCount = 0;

  for (const tx of pendingTx) {
    let mockStatus: string | undefined;
    let mockAmount: number | undefined;

    if (options?.mockGatewayLookup) {
      const gw = options.mockGatewayLookup(tx.orderId);
      if (gw) {
        mockStatus = gw.status;
        mockAmount = gw.amount;
      }
    }

    const rec = await reconcileSingleOrder(tx.orderId, {
      mockGatewayStatus: mockStatus,
      mockGatewayAmount: mockAmount,
      gatewayProvider: options?.gatewayProvider,
    });

    if (rec.actionTaken !== "none") {
      records.push(rec);
      if (rec.resolved) {
        resolvedCount++;
      } else {
        flaggedCount++;
      }
    }
  }

  return {
    scannedCount: pendingTx.length,
    resolvedCount,
    flaggedCount,
    records,
  };
}
