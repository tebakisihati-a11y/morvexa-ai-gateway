import type { UpstreamProviderId, UpstreamProviderConfig } from "../types";

export interface FailoverRouteResult {
  selectedProvider: UpstreamProviderId;
  routedModel: string;
  failoverOccurred: boolean;
  failoverHops: UpstreamProviderId[];
}

export const DEFAULT_PROVIDERS: UpstreamProviderConfig[] = [
  {
    id: "custom",
    name: "Private Server (localhost:5002)",
    apiKey: "configured",
    priority: 1,
    isActive: true,
    latencyMs: 12,
    health: "healthy",
    baseUrl: process.env.PRIVATE_SERVER_URL || "http://localhost:5002",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    apiKey: "",
    priority: 2,
    isActive: true,
    latencyMs: 142,
    health: "healthy",
    baseUrl: "https://api.anthropic.com/v1",
  },
  {
    id: "deepseek",
    name: "DeepSeek AI",
    apiKey: "",
    priority: 2,
    isActive: true,
    latencyMs: 98,
    health: "healthy",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "openai",
    name: "OpenAI GPT-4o",
    apiKey: "",
    priority: 3,
    isActive: true,
    latencyMs: 165,
    health: "healthy",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "groq",
    name: "Groq LPU",
    apiKey: "",
    priority: 4,
    isActive: true,
    latencyMs: 45,
    health: "healthy",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    apiKey: "",
    priority: 5,
    isActive: true,
    latencyMs: 120,
    health: "healthy",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
];

/**
 * Determines provider routing and failover path based on requested model and provider health.
 */
export function resolveProviderRoute(
  requestedModel: string,
  simulatedErrorProvider?: UpstreamProviderId
): FailoverRouteResult {
  const hops: UpstreamProviderId[] = [];

  let primary: UpstreamProviderId = "anthropic";
  if (requestedModel.toLowerCase().includes("gpt") || requestedModel.toLowerCase().includes("o3")) {
    primary = "openai";
  } else if (requestedModel.toLowerCase().includes("deepseek")) {
    primary = "deepseek";
  } else if (requestedModel.toLowerCase().includes("gemini")) {
    primary = "gemini";
  }

  hops.push(primary);

  // If primary has an upstream outage or rate-limit (simulated or flagged)
  if (simulatedErrorProvider && simulatedErrorProvider === primary) {
    const fallback: UpstreamProviderId = primary === "anthropic" ? "deepseek" : "groq";
    hops.push(fallback);
    return {
      selectedProvider: fallback,
      routedModel: requestedModel,
      failoverOccurred: true,
      failoverHops: hops,
    };
  }

  return {
    selectedProvider: primary,
    routedModel: requestedModel,
    failoverOccurred: false,
    failoverHops: hops,
  };
}
