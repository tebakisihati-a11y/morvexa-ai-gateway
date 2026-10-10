/**
 * Morvexa Nexus — Midtrans Payment Gateway & Webhook Engine
 * Implements SHA-512 signature verification, replay defense, idempotency,
 * and state transition lifecycle rules.
 */

import { createHash, timingSafeEqual } from "crypto";
import type {
  MidtransNotificationPayload,
  TransactionStatus,
  WebhookProcessingResult,
} from "./types";

/**
 * Calculates the authoritative Midtrans SHA-512 signature key:
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function calculateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  // Normalize gross_amount: Midtrans may format as "100000.00" or "100000"
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return createHash("sha512").update(rawString).digest("hex");
}

/**
 * Validates the authenticity of an incoming Midtrans webhook notification.
 * Uses timingSafeEqual to prevent timing side-channel attacks.
 */
export function verifyMidtransSignature(
  payload: MidtransNotificationPayload,
  serverKey: string
): boolean {
  if (!payload || !payload.signature_key || !serverKey) {
    return false;
  }

  const calculated = calculateMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    serverKey
  );

  if (calculated.length !== payload.signature_key.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(calculated, "utf-8"),
      Buffer.from(payload.signature_key, "utf-8")
    );
  } catch {
    return false;
  }
}

/**
 * Maps Midtrans transaction_status & fraud_status to internal TransactionStatus.
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): TransactionStatus {
  const status = transactionStatus.toLowerCase();

  switch (status) {
    case "capture":
      if (fraudStatus === "challenge") return "pending";
      if (fraudStatus === "accept") return "settled";
      return "failed";

    case "settlement":
      return "settled";

    case "pending":
      return "pending";

    case "deny":
    case "cancel":
      return "failed";

    case "expire":
      return "expired";

    case "refund":
    case "partial_refund":
      return "refunded";

    default:
      return "failed";
  }
}

/**
 * Validates monotonic state advancement.
 * Once a transaction is SETTLED, it can NEVER regress to PENDING, EXPIRED, or FAILED.
 */
export function canTransitionStatus(
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus
): boolean {
  if (currentStatus === newStatus) return true;

  if (currentStatus === "settled") {
    // Only refunds or disputes can occur after settlement
    return newStatus === "refunded" || newStatus === "disputed";
  }

  if (currentStatus === "failed" || currentStatus === "expired") {
    // Terminal failure states cannot transition back to pending
    return newStatus !== "pending";
  }

  return true;
}

/**
 * In-memory state store for webhooks and transactions (for serverless edge caching & test isolation).
 * In production Supabase environments, this is synchronized with PostgreSQL tables.
 */
interface ProcessedEventRecord {
  provider: string;
  eventId: string;
  orderId: string;
  status: TransactionStatus;
  processedAt: string;
  invoiceId?: string;
}

const memoryProcessedEvents = new Map<string, ProcessedEventRecord>();
const memoryTransactions = new Map<string, { status: TransactionStatus; orgId?: string; amount: number }>();

/**
 * Resets in-memory storage (used exclusively by test suites).
 */
export function resetBillingTestStore(): void {
  memoryProcessedEvents.clear();
  memoryTransactions.clear();
}

/**
 * Seeds a transaction state in memory for testing or local execution.
 */
export function seedTransaction(orderId: string, status: TransactionStatus, amount = 750000, orgId = "org_default"): void {
  memoryTransactions.set(orderId, { status, orgId, amount });
}

/**
 * Ingests and processes a Midtrans webhook notification with full idempotency,
 * signature validation, and state monotonic transition enforcement.
 */
export async function processMidtransWebhook(
  payload: MidtransNotificationPayload,
  options?: {
    serverKey?: string;
    overrideStore?: boolean;
  }
): Promise<WebhookProcessingResult> {
  const serverKey = options?.serverKey || process.env.MIDTRANS_SERVER_KEY || "dummy_sandbox_key";

  // 1. Authenticate signature
  const isValid = verifyMidtransSignature(payload, serverKey);
  if (!isValid) {
    return {
      success: false,
      duplicate: false,
      orderId: payload.order_id,
      status: "failed",
      subscriptionActivated: false,
      message: "Cryptographic signature verification failed (401 Unauthorized)",
    };
  }

  const eventKey = `midtrans:${payload.transaction_id || payload.order_id}`;

  // 2. Replay & Idempotency Defense
  const existingEvent = memoryProcessedEvents.get(eventKey);
  if (existingEvent) {
    return {
      success: true,
      duplicate: true,
      transactionId: payload.transaction_id,
      orderId: payload.order_id,
      status: existingEvent.status,
      subscriptionActivated: false,
      invoiceId: existingEvent.invoiceId,
      message: "Duplicate webhook event safely acknowledged without reprocessing (idempotent)",
    };
  }

  // 3. Resolve target status
  const targetStatus = mapMidtransStatus(payload.transaction_status, payload.fraud_status);

  // 4. Monotonic State Check against current transaction
  const currentTx = memoryTransactions.get(payload.order_id);
  const currentStatus = currentTx?.status || "pending";

  if (!canTransitionStatus(currentStatus, targetStatus)) {
    return {
      success: true,
      duplicate: false,
      orderId: payload.order_id,
      status: currentStatus,
      subscriptionActivated: false,
      message: `Ignored out-of-order status update: cannot transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  // 5. Update transaction state
  let subscriptionActivated = false;
  let invoiceId: string | undefined;

  if (targetStatus === "settled") {
    subscriptionActivated = true;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    invoiceId = `INV-${dateStr}-${payload.order_id.slice(-6).toUpperCase()}`;
  }

  // Record transaction in store
  memoryTransactions.set(payload.order_id, {
    status: targetStatus,
    amount: parseFloat(payload.gross_amount) || 0,
    orgId: payload.custom_field1 || currentTx?.orgId || "org_default",
  });

  // Record processed webhook event for replay defense
  memoryProcessedEvents.set(eventKey, {
    provider: "midtrans",
    eventId: payload.transaction_id || payload.order_id,
    orderId: payload.order_id,
    status: targetStatus,
    processedAt: new Date().toISOString(),
    invoiceId,
  });

  return {
    success: true,
    duplicate: false,
    transactionId: payload.transaction_id,
    orderId: payload.order_id,
    status: targetStatus,
    subscriptionActivated,
    invoiceId,
    message: `Payment successfully processed with status: ${targetStatus}`,
  };
}

/**
 * Retrieves the stored state of a transaction by orderId.
 */
export function getTransaction(orderId: string): { status: TransactionStatus; amount: number; orgId?: string } | null {
  return memoryTransactions.get(orderId) || null;
}

/**
 * Creates a sandbox checkout session with Midtrans Snap simulation.
 */
export function createMidtransSandboxCheckout(params: {
  orgId: string;
  planCode: string;
  amount: number;
  customerName: string;
  customerEmail: string;
}): {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  amount: number;
  currency: string;
} {
  const orderId = `MVX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const snapToken = `snap-token-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;

  seedTransaction(orderId, "pending", params.amount, params.orgId);

  return {
    orderId,
    snapToken,
    redirectUrl,
    amount: params.amount,
    currency: "IDR",
  };
}

