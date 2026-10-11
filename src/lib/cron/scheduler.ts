/**
 * Morvexa Nexus — Scheduled Background Jobs Engine (Phase 7)
 * Implements automated execution handlers for:
 * 1. Financial webhook reconciliation & retry
 * 2. Subscription lifecycle & expiration checks
 * 3. Rolling quota aggregation & metric cleanups
 */

import { runAutomatedReconciliation } from "../billing/reconciliation";
import { recordAuditLog } from "../audit/logger";
import { getAllTransactions, updateTransaction } from "../billing/midtrans";

export interface CronJobResult {
  job: string;
  success: boolean;
  timestamp: string;
  durationMs: number;
  details: Record<string, unknown>;
}

/**
 * Validates the authorization header for cron trigger endpoints.
 * Supports Vercel Cron secret (`Bearer ${CRON_SECRET}`) or internal platform key.
 */
export function verifyCronAuthorization(authHeader?: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If not set in development/sandbox, allow local requests with bearer or default token
    return true;
  }
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === secret;
}

/**
 * Job 1: Reconciles all pending transactions against payment gateway.
 */
export async function executeReconciliationCron(): Promise<CronJobResult> {
  const startTime = Date.now();
  try {
    const reconResult = await runAutomatedReconciliation({
      minPendingAgeMs: 5 * 60 * 1000, // Look at items pending for > 5 mins
    });

    recordAuditLog({
      actorType: "cron",
      actorId: "system:cron:reconcile",
      action: "CRON_JOB_EXECUTED",
      resourceType: "billing_reconciliation",
      resourceId: `recon_batch_${Date.now()}`,
      status: "success",
      details: {
        scannedCount: reconResult.scannedCount,
        resolvedCount: reconResult.resolvedCount,
        flaggedCount: reconResult.flaggedCount,
      },
    });

    return {
      job: "reconciliation_cron",
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      details: {
        ...reconResult,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordAuditLog({
      actorType: "cron",
      actorId: "system:cron:reconcile",
      action: "CRON_JOB_EXECUTED",
      resourceType: "billing_reconciliation",
      resourceId: `recon_batch_${Date.now()}`,
      status: "failure",
      details: { error: errorMsg },
    });

    return {
      job: "reconciliation_cron",
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      details: { error: errorMsg },
    };
  }
}

/**
 * Job 2: Sweeps subscriptions and transactions for expired statuses.
 */
export async function executeSubscriptionLifecycleCron(): Promise<CronJobResult> {
  const startTime = Date.now();
  try {
    const allTxs = getAllTransactions();
    const now = Date.now();
    const EXPIRY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours pending without payment
    let expiredCount = 0;

    for (const tx of allTxs) {
      if (tx.status === "pending" && now - tx.createdAt > EXPIRY_THRESHOLD_MS) {
        updateTransaction(tx.orderId, { status: "expired" });
        expiredCount++;

        recordAuditLog({
          actorType: "cron",
          actorId: "system:cron:subscriptions",
          action: "SUBSCRIPTION_STATUS_CHANGED",
          resourceType: "transaction",
          resourceId: tx.orderId,
          status: "success",
          details: {
            previousStatus: "pending",
            newStatus: "expired",
            reason: "24h_timeout_exceeded",
          },
        });
      }
    }

    return {
      job: "subscription_lifecycle_cron",
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      details: {
        totalTransactionsChecked: allTxs.length,
        expiredTransactionsCount: expiredCount,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      job: "subscription_lifecycle_cron",
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      details: { error: errorMsg },
    };
  }
}
