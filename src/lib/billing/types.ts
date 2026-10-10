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

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "pending_payment"
  | "past_due"
  | "canceled"
  | "expired";

export type PaymentProvider = "midtrans" | "xendit";

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

export interface CheckoutRequest {
  orgId: string;
  planCode: "developer" | "pro" | "apex" | "zenith";
  billingPeriod: "monthly" | "annual";
  customerName: string;
  customerEmail: string;
}

export interface CheckoutResult {
  orderId: string;
  snapToken?: string;
  redirectUrl: string;
  amount: number;
  currency: string;
}
