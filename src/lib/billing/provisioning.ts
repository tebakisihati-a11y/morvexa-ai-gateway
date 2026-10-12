import { generateSecureApiKey } from "../auth/keys";
import { createApiKey } from "../supabase/store";
import type { ApiKeyItem } from "../types";

/**
 * Customer Automated Key Provisioning & Dispatch Service
 * Handles automatic key creation upon paid subscription settlement and simulated/SMTP dispatch.
 */

export interface ProvisionSubscriptionResult {
  success: boolean;
  apiKey: ApiKeyItem;
  rawSecret: string;
  emailSentTo: string;
  planCode: string;
  dispatchedAt: string;
  message: string;
}

export interface DispatchedEmailReceipt {
  orderId: string;
  recipientEmail: string;
  planName: string;
  apiKeyPrefix: string;
  rawSecret: string;
  rateLimitRpm: number;
  modelsIncluded: string[];
  sentAt: string;
}

// In-memory dispatch audit logs
const dispatchedReceipts: DispatchedEmailReceipt[] = [];

/**
 * Map plan code to quota & model allowances
 */
export const PLAN_SPECS: Record<
  string,
  {
    name: string;
    rateLimitRpm: number;
    dailyTokens: number;
    models: string[];
  }
> = {
  developer: {
    name: "Developer Starter",
    rateLimitRpm: 30,
    dailyTokens: 50000,
    models: ["deepseek-chat", "gemini-2.0-flash"],
  },
  pro: {
    name: "Pro Workspace",
    rateLimitRpm: 120,
    dailyTokens: 300000,
    models: ["claude-3-5-sonnet", "deepseek-chat", "gpt-4o", "gemini-2.0-flash"],
  },
  apex: {
    name: "Apex Scale",
    rateLimitRpm: 300,
    dailyTokens: 1500000,
    models: ["claude-3-7-sonnet", "claude-3-5-sonnet", "gpt-4o", "deepseek-chat", "gemini-2.0-flash"],
  },
  zenith: {
    name: "Zenith Enterprise",
    rateLimitRpm: 1000,
    dailyTokens: 10000000,
    models: ["claude-3-7-sonnet", "claude-3-5-sonnet", "gpt-4o", "deepseek-chat", "gemini-2.0-flash", "private-server-5002"],
  },
};

/**
 * Automatically provisions an active Morvexa Gateway API Key
 * and dispatches it directly to the customer's verified email.
 */
export async function autoProvisionCustomerKey(params: {
  orderId: string;
  customerEmail: string;
  customerName: string;
  planCode: string;
  orgId?: string;
}): Promise<ProvisionSubscriptionResult> {
  const { orderId, customerEmail, customerName, planCode, orgId = "org_default" } = params;
  const spec = PLAN_SPECS[planCode.toLowerCase()] || PLAN_SPECS.pro;

  // 1. Generate active API Key for the customer
  const keyName = `${spec.name} Key (${orderId})`;
  const creation = await createApiKey(keyName, spec.rateLimitRpm, spec.dailyTokens);

  // 2. Dispatch simulated / transactional email
  const receipt: DispatchedEmailReceipt = {
    orderId,
    recipientEmail: customerEmail,
    planName: spec.name,
    apiKeyPrefix: creation.key.prefix,
    rawSecret: creation.rawSecret,
    rateLimitRpm: spec.rateLimitRpm,
    modelsIncluded: spec.models,
    sentAt: new Date().toISOString(),
  };

  dispatchedReceipts.unshift(receipt);

  // 3. Directly integrate into customer orders and owner monitoring database
  try {
    const { recordCustomerOrder } = await import("../customer/store");
    const priceCatalog: Record<string, number> = {
      developer: 0,
      pro: 750000,
      apex: 2500000,
      zenith: 10000000,
    };
    recordCustomerOrder({
      customerId: orgId,
      customerEmail,
      customerName,
      orderType: "plan_subscription",
      productCode: planCode,
      productName: spec.name,
      amountIdr: priceCatalog[planCode.toLowerCase()] ?? 750000,
      tokensGranted: spec.dailyTokens,
      paymentMethod: "payment_gateway",
      status: "settled",
      apiKeyDispatched: creation.key.maskedKey,
    });
  } catch (err) {
    // Fail-open for external logging
  }

  console.log(`[Morvexa Automated Dispatch] API Key generated for ${customerEmail} (${spec.name}): ${creation.key.maskedKey}`);

  return {
    success: true,
    apiKey: creation.key,
    rawSecret: creation.rawSecret,
    emailSentTo: customerEmail,
    planCode,
    dispatchedAt: receipt.sentAt,
    message: `API Key successfully provisioned and dispatched to ${customerEmail}.`,
  };
}

/**
 * Returns all dispatched customer receipts (for audit & customer verification).
 */
export function getDispatchedReceipts(): DispatchedEmailReceipt[] {
  return [...dispatchedReceipts];
}

/**
 * Finds the latest dispatched receipt for a given email address.
 */
export function getCustomerReceiptByEmail(email: string): DispatchedEmailReceipt | undefined {
  return dispatchedReceipts.find(
    (r) => r.recipientEmail.toLowerCase() === email.trim().toLowerCase()
  );
}
