import type { UpstreamProviderId } from "../types";

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface NormalizedModelSpec {
  id: string;
  provider: UpstreamProviderId;
  name: string;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
}

export interface GatewayExecutionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

export interface ProviderExecutionResponse {
  response?: Response;
  simulatedPayload?: any;
  providerUsed: UpstreamProviderId;
  promptTokens: number;
  completionTokens: number;
}

export interface ProviderAdapter {
  readonly id: UpstreamProviderId;
  readonly name: string;
  readonly defaultBaseUrl: string;

  execute(
    req: GatewayExecutionRequest,
    creds: ProviderCredentials
  ): Promise<ProviderExecutionResponse>;

  healthCheck(creds?: ProviderCredentials): Promise<{
    status: "healthy" | "degraded" | "down";
    latencyMs: number;
    checkedAt: string;
  }>;
}

/**
 * Universal Registry of AI Providers
 */
export const MODEL_REGISTRY: Record<string, NormalizedModelSpec> = {
  "claude-3-7-sonnet": {
    id: "claude-3-7-sonnet",
    provider: "anthropic",
    name: "Claude 3.7 Sonnet (Hybrid Reasoning)",
    contextWindow: 200000,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    supportsStreaming: true,
    supportsToolCalling: true,
  },
  "claude-3-5-sonnet": {
    id: "claude-3-5-sonnet",
    provider: "anthropic",
    name: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    supportsStreaming: true,
    supportsToolCalling: true,
  },
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4o (Omni)",
    contextWindow: 128000,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    supportsStreaming: true,
    supportsToolCalling: true,
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    provider: "deepseek",
    name: "DeepSeek V3",
    contextWindow: 64000,
    inputCostPer1k: 0.00014,
    outputCostPer1k: 0.00028,
    supportsStreaming: true,
    supportsToolCalling: true,
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    provider: "gemini",
    name: "Gemini 2.0 Flash",
    contextWindow: 1000000,
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0004,
    supportsStreaming: true,
    supportsToolCalling: true,
  },
};
