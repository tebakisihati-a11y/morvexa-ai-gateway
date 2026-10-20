/**
 * Autonomous Key Provisioning & Auto-Approval Engine
 *
 * Automates the validation, risk-scoring, quota assignment, and cryptographic
 * generation of API keys requested by customers or triggered by purchases.
 */

import { randomUUID } from "node:crypto";
import type { ApiKeyItem } from "../types";
import { getRegisteredCustomers } from "../customer/store";
import { createApiKeyForCustomer } from "../supabase/keyPersistence";
import { recordAuditLog } from "../audit/logger";

export interface KeyProvisionRequest {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  keyName: string;
  requestedTier: "developer" | "pro" | "apex" | "custom";
  modelAllowlist: string[];
  rateLimitRpm: number;
  dailyTokenLimit: number;
  status: "pending" | "auto_approved" | "manual_approved" | "rejected" | "dispatched";
  riskScore: number; // 0 = lowest risk, 100 = high risk
  riskReasons: string[];
  emailVerified: boolean;
  createdAt: string;
  processedAt?: string;
  issuedKeyId?: string;
  issuedKeyPrefix?: string;
  rejectionReason?: string;
}

export interface ProvisioningPolicy {
  autoApprovalEnabled: boolean;
  requireEmailVerification: boolean;
  maxRiskScoreForAutoApprove: number;
  defaultRpmByTier: Record<string, number>;
  defaultDailyTokensByTier: Record<string, number>;
  maxKeysPerCustomer: number;
  enforceDomainBlocklist: boolean;
}

let policy: ProvisioningPolicy = {
  autoApprovalEnabled: true,
  requireEmailVerification: true,
  maxRiskScoreForAutoApprove: 35,
  defaultRpmByTier: {
    developer: 60,
    pro: 150,
    apex: 500,
    custom: 100,
  },
  defaultDailyTokensByTier: {
    developer: 500_000,
    pro: 2_000_000,
    apex: 10_000_000,
    custom: 1_000_000,
  },
  maxKeysPerCustomer: 10,
  enforceDomainBlocklist: true,
};

const now = Date.now();

// Initial memory queue with customer requests
let memoryQueue: KeyProvisionRequest[] = [
  {
    id: "req-901",
    customerId: "cust-002",
    customerEmail: "founder@startup.id",
    customerName: "Rian Prasetyo",
    keyName: "Production Backend Workers",
    requestedTier: "pro",
    modelAllowlist: ["claude-3-7-sonnet", "deepseek-v3", "gpt-4o"],
    rateLimitRpm: 150,
    dailyTokenLimit: 2_000_000,
    status: "pending",
    riskScore: 12,
    riskReasons: ["Domain startup.id terverifikasi DNS", "Akun Gmail aktif"],
    emailVerified: true,
    createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "req-902",
    customerId: "cust-003",
    customerEmail: "engineer@fintech.co",
    customerName: "Siti Rahmawati",
    keyName: "Financial Copilot Agent Node",
    requestedTier: "apex",
    modelAllowlist: ["claude-3-7-sonnet", "deepseek-r1", "gemini-2.0-flash"],
    rateLimitRpm: 500,
    dailyTokenLimit: 10_000_000,
    status: "pending",
    riskScore: 8,
    riskReasons: ["Enterprise customer terdaftar", "Pembayaran QRIS settled"],
    emailVerified: true,
    createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "req-903",
    customerId: "cust-004",
    customerEmail: "budi.santoso@yahoo.com",
    customerName: "Budi Santoso",
    keyName: "Local Evaluation Test",
    requestedTier: "developer",
    modelAllowlist: ["deepseek-v3", "gemini-2.0-flash"],
    rateLimitRpm: 60,
    dailyTokenLimit: 500_000,
    status: "dispatched",
    riskScore: 5,
    riskReasons: ["Akun baru", "Email Yahoo Mail terverifikasi"],
    emailVerified: true,
    createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
    processedAt: new Date(now - 1000 * 60 * 179).toISOString(),
    issuedKeyId: "key-cust-4",
    issuedKeyPrefix: "mvx_live_budi",
  },
  {
    id: "req-904",
    customerId: "cust-unverified",
    customerEmail: "temp.bot992@mailinator.com",
    customerName: "Bot Scraper 99",
    keyName: "Bulk Harvester",
    requestedTier: "developer",
    modelAllowlist: ["claude-3-7-sonnet"],
    rateLimitRpm: 60,
    dailyTokenLimit: 500_000,
    status: "rejected",
    riskScore: 88,
    riskReasons: ["Domain email disposable (mailinator.com)", "Alamat IP proxy berisiko"],
    emailVerified: false,
    createdAt: new Date(now - 1000 * 60 * 300).toISOString(),
    processedAt: new Date(now - 1000 * 60 * 295).toISOString(),
    rejectionReason: "Auto-Rejected: Disposable email domain & email unverified.",
  },
];

export function getProvisioningQueue(): KeyProvisionRequest[] {
  return [...memoryQueue];
}

export function getProvisioningPolicy(): ProvisioningPolicy {
  return { ...policy };
}

export function updateProvisioningPolicy(updates: Partial<ProvisioningPolicy>): ProvisioningPolicy {
  policy = { ...policy, ...updates };
  return { ...policy };
}

export async function approveKeyProvisionRequest(
  requestId: string,
  overrides?: { rateLimitRpm?: number; dailyTokenLimit?: number }
): Promise<{ request: KeyProvisionRequest; key: ApiKeyItem; rawSecret: string } | null> {
  const req = memoryQueue.find((r) => r.id === requestId);
  if (!req) return null;

  const rpm = overrides?.rateLimitRpm ?? req.rateLimitRpm;
  const tokens = overrides?.dailyTokenLimit ?? req.dailyTokenLimit;

  const created = await createApiKeyForCustomer({
    customerId: req.customerId,
    customerEmail: req.customerEmail,
    name: req.keyName,
    rateLimitRpm: rpm,
    dailyTokenLimit: tokens,
    planCode: req.requestedTier,
  });

  req.status = "manual_approved";
  req.processedAt = new Date().toISOString();
  req.issuedKeyId = created.key.id;
  req.issuedKeyPrefix = created.key.prefix;

  recordAuditLog({
    actorType: "user",
    actorId: "owner_console",
    action: "API_KEY_CREATED",
    resourceType: "api_key",
    resourceId: created.key.id,
    status: "success",
    details: {
      requestId,
      customerId: req.customerId,
      customerEmail: req.customerEmail,
      tier: req.requestedTier,
      rpm,
      tokens,
    },
  });

  return { request: req, key: created.key, rawSecret: created.rawSecret };
}

export function rejectKeyProvisionRequest(requestId: string, reason: string): KeyProvisionRequest | null {
  const req = memoryQueue.find((r) => r.id === requestId);
  if (!req) return null;

  req.status = "rejected";
  req.processedAt = new Date().toISOString();
  req.rejectionReason = reason;

  recordAuditLog({
    actorType: "user",
    actorId: "owner_console",
    action: "API_KEY_REVOKED",
    resourceType: "key_provision_request",
    resourceId: requestId,
    status: "success",
    details: {
      customerId: req.customerId,
      customerEmail: req.customerEmail,
      reason,
    },
  });

  return req;
}

export async function batchApprovePendingRequests(): Promise<{ approvedCount: number; errors: string[] }> {
  const pending = memoryQueue.filter((r) => r.status === "pending");
  let approvedCount = 0;
  const errors: string[] = [];

  for (const item of pending) {
    if (policy.requireEmailVerification && !item.emailVerified) {
      errors.push(`${item.customerEmail}: Email belum diverifikasi.`);
      continue;
    }

    if (item.riskScore > policy.maxRiskScoreForAutoApprove) {
      errors.push(`${item.customerEmail}: Skor risiko ${item.riskScore} melebihi ambang batas.`);
      continue;
    }

    try {
      await approveKeyProvisionRequest(item.id);
      approvedCount++;
    } catch (e: any) {
      errors.push(`${item.customerEmail}: ${e?.message || "Gagal membuat key"}`);
    }
  }

  return { approvedCount, errors };
}
