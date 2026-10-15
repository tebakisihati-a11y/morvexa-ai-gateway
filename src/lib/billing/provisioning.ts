import { createApiKey } from "../supabase/store";
import { PLAN_SPECS } from "./catalog";
import type { ApiKeyItem } from "../types";

/**
 * Customer Automated Key Provisioning & Dispatch Service
 * Handles automatic key creation upon paid subscription settlement and simulated/SMTP dispatch.
 */

export interface ProvisionSubscriptionResult {
  success: boolean;
  /** False when the account has not verified its email, so no key was issued. */
  blocked?: boolean;
  apiKey: ApiKeyItem;
  rawSecret: string;
  emailSentTo: string;
  /** False when no mail transport is configured, so the UI can say so. */
  emailDelivered: boolean;
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
 * Map plan code to quota & model allowances.
 *
 * The spec table lives in ./catalog so client components can import it without
 * dragging in the Supabase service client that this module depends on.
 */
export { PLAN_SPECS };

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

  // 0. Refuse to issue a key to an address nobody has proven they control.
  //    Mailing a live credential to an unverified address would let anyone
  //    obtain a working key for someone else's mailbox.
  const { findCustomerByEmail, isEmailVerified } = await import("../customer/store");
  const account = findCustomerByEmail(customerEmail);
  if (account && !isEmailVerified(account)) {
    return {
      success: false,
      blocked: true,
      apiKey: null as unknown as ApiKeyItem,
      rawSecret: "",
      emailSentTo: customerEmail,
      emailDelivered: false,
      planCode,
      dispatchedAt: new Date().toISOString(),
      message:
        "Email pelanggan belum diverifikasi. API key baru dapat diterbitkan setelah email diverifikasi.",
    };
  }

  // 1. Generate active API Key for the customer
  const keyName = `${spec.name} Key (${orderId})`;
  const creation = await createApiKey(keyName, spec.rateLimitRpm, spec.dailyTokens);

  // 2. Deliver the key by email. The receipt is recorded regardless of the
  //    transport outcome so the owner audit trail shows what was attempted.
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

  const { sendEmail } = await import("../email/send");
  const { apiKeyDeliveryEmail } = await import("../email/templates");
  const delivery = await sendEmail({
    to: customerEmail,
    email: apiKeyDeliveryEmail({
      name: customerName,
      planName: spec.name,
      orderId,
      apiKey: creation.rawSecret,
      rateLimitRpm: spec.rateLimitRpm,
      models: spec.models,
    }),
  });

  if (!delivery.delivered) {
    console.warn(
      `[Morvexa Dispatch] API key email to ${customerEmail} was NOT delivered ` +
        `(transport: ${delivery.transport}). The key is still valid and shown in the portal.`
    );
  }

  // 3. Directly integrate into customer orders and owner monitoring database
  try {
    const { recordCustomerOrder } = await import("../customer/store");
    const priceCatalog: Record<string, number> = {
      developer: 0,
      pro: 750000,
      apex: 2500000,
      zenith: 10000000,
    };
    await recordCustomerOrder({
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
    emailDelivered: delivery.delivered,
    planCode,
    dispatchedAt: receipt.sentAt,
    message: delivery.delivered
      ? `API Key provisioned and emailed to ${customerEmail}.`
      : `API Key provisioned for ${customerEmail}. Email delivery is not configured, so the key is shown here instead.`,
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
