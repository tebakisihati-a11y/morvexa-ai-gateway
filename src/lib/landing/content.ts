/**
 * Landing page content.
 *
 * Model and plan facts are derived from the runtime registries so the marketing
 * surface cannot drift away from what the gateway actually serves.
 */

import { MODEL_REGISTRY } from "@/lib/gateway/adapters";
import { PLAN_SPECS } from "@/lib/billing/provisioning";

export interface ProviderWordmark {
  name: string;
  models: string;
}

/** Providers the gateway currently routes to. */
export const PROVIDERS: ProviderWordmark[] = [
  { name: "Anthropic", models: "Claude 3.7 / 3.5 Sonnet, Haiku" },
  { name: "OpenAI", models: "GPT-4o" },
  { name: "DeepSeek", models: "V3 Chat" },
  { name: "Google", models: "Gemini 2.0 Flash" },
  { name: "Private", models: "Self-hosted endpoint" },
];

const CONTEXT_LABELS: Record<number, string> = {
  64000: "64K",
  128000: "128K",
  200000: "200K",
  1000000: "1M",
};

export interface ModelCard {
  id: string;
  provider: string;
  name: string;
  context: string;
  streaming: boolean;
  tools: boolean;
  /** Relative cost band, derived from the registry's per-1K input price. */
  costTier: "lowest" | "low" | "medium" | "high";
}

function costTier(inputCostPer1k: number): ModelCard["costTier"] {
  if (inputCostPer1k < 0.0002) return "lowest";
  if (inputCostPer1k < 0.001) return "low";
  if (inputCostPer1k < 0.003) return "medium";
  return "high";
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  gemini: "Google",
  custom: "Private",
  groq: "Groq",
};

export const MODEL_CARDS: ModelCard[] = Object.values(MODEL_REGISTRY).map((model) => ({
  id: model.id,
  provider: PROVIDER_LABELS[model.provider] ?? model.provider,
  name: model.name,
  context: CONTEXT_LABELS[model.contextWindow] ?? `${Math.round(model.contextWindow / 1000)}K`,
  streaming: model.supportsStreaming,
  tools: model.supportsToolCalling,
  costTier: costTier(model.inputCostPer1k),
}));

export const COST_TIER_LABELS: Record<ModelCard["costTier"], string> = {
  lowest: "Paling hemat",
  low: "Hemat",
  medium: "Menengah",
  high: "Premium",
};

export interface PlanCard {
  code: string;
  name: string;
  priceIdr: number;
  rpm: number;
  dailyTokens: number;
  modelCount: number;
  blurb: string;
  featured: boolean;
}

const PLAN_BLURBS: Record<string, string> = {
  developer: "Untuk evaluasi dan prototipe dengan model paling hemat.",
  pro: "Untuk produksi kecil yang butuh failover dan audit trail.",
  apex: "Untuk trafik tinggi dengan akses seluruh model frontier.",
};

// Prices mirror AUTHORITATIVE_PLAN_PRICES in src/lib/gateway/app.ts, which is
// the value the checkout endpoint actually charges.
const PLAN_PRICES_IDR: Record<string, number> = {
  developer: 0,
  pro: 750000,
  apex: 2500000,
  zenith: 10000000,
};

export const PLAN_CARDS: PlanCard[] = Object.entries(PLAN_SPECS)
  .filter(([code]) => code !== "zenith")
  .map(([code, spec]) => ({
    code,
    name: spec.name,
    priceIdr: PLAN_PRICES_IDR[code] ?? 0,
    rpm: spec.rateLimitRpm,
    dailyTokens: spec.dailyTokens,
    modelCount: spec.models.length,
    blurb: PLAN_BLURBS[code] ?? "",
    featured: code === "pro",
  }));

export function formatIdr(value: number): string {
  if (value === 0) return "Gratis";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function formatTokens(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toLocaleString("id-ID")} jt`;
  if (value >= 1000) return `${Math.round(value / 1000)} rb`;
  return String(value);
}
