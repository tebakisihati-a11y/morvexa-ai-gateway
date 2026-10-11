/**
 * Morvexa Nexus — Billing & Payment Gateway Types
 */

export type TransactionStatus =
  | "pending"
  | "settled"
  | "failed"
  | "expired"
  | "refunded"
  | "disputed";

export type PaymentMethod =
  | "qris"
  | "bank_transfer"
  | "credit_card"
  | "gopay"
  | "shopeepay"
  | "other";

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id: string;
  transaction_time?: string;
  settlement_time?: string;
  currency?: string;
  custom_field1?: string; // typically org_id
  custom_field2?: string; // plan_code
}

export interface WebhookProcessingResult {
  success: boolean;
  duplicate: boolean;
  transactionId?: string;
  orderId: string;
  status: TransactionStatus;
  subscriptionActivated: boolean;
  invoiceId?: string;
  message: string;
}

export interface CheckoutResult {
  orderId: string;
  snapToken?: string;
  redirectUrl: string;
  amount: number;
  currency: string;
}

export type DiscrepancyType =
  | "UNSETTLED_CAPTURE"
  | "AMOUNT_MISMATCH"
  | "ORPHAN_TRANSACTION"
  | "EXPIRED_CLEANUP"
  | "CANCELLED_CLEANUP"
  | "RECURRING_DRIFT";

export interface ReconciliationRecord {
  id: string;
  orderId: string;
  discrepancyType: DiscrepancyType;
  severity: "low" | "medium" | "high" | "critical";
  internalStatus: TransactionStatus | "not_found";
  gatewayStatus: string;
  internalAmount: number;
  gatewayAmount: number;
  actionTaken:
    | "auto_settled"
    | "marked_expired"
    | "marked_failed"
    | "flagged_for_manual_review"
    | "none";
  resolved: boolean;
  timestamp: string;
  invoiceId?: string;
  details?: string;
}

export interface BatchReconciliationResult {
  scannedCount: number;
  resolvedCount: number;
  flaggedCount: number;
  records: ReconciliationRecord[];
}

