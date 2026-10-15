/**
 * Client-safe billing catalog.
 *
 * Plan quotas and prices are needed by client components (pricing tables,
 * checkout dialogs). Keeping them here — with no imports that reach into
 * `node:crypto` or the Supabase service client — means those components never
 * pull server-only code into the browser bundle.
 *
 * src/lib/billing/provisioning.ts re-exports these for server callers.
 */

export interface PlanSpec {
  name: string;
  rateLimitRpm: number;
  dailyTokens: number;
  models: string[];
}

export const PLAN_SPECS: Record<string, PlanSpec> = {
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
    models: [
      "claude-3-7-sonnet",
      "claude-3-5-sonnet",
      "gpt-4o",
      "deepseek-chat",
      "gemini-2.0-flash",
    ],
  },
  zenith: {
    name: "Zenith Enterprise",
    rateLimitRpm: 1000,
    dailyTokens: 10000000,
    models: [
      "claude-3-7-sonnet",
      "claude-3-5-sonnet",
      "gpt-4o",
      "deepseek-chat",
      "gemini-2.0-flash",
      "private-server-5002",
    ],
  },
};

/**
 * Authoritative plan prices in IDR. The checkout endpoint charges exactly these
 * values and ignores any amount supplied by the client.
 */
export const PLAN_PRICES_IDR: Record<string, number> = {
  developer: 0,
  pro: 750000,
  apex: 2500000,
  zenith: 10000000,
};

export function resolvePlanSpec(planCode: string): PlanSpec {
  return PLAN_SPECS[planCode.toLowerCase()] ?? PLAN_SPECS.pro;
}
