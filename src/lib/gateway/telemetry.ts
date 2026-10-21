import type { SystemMetrics } from "../types";

interface GatewayRequestSample {
  timestamp: number;
  durationMs: number;
  statusCode: number;
  provider?: string;
}

export interface ProviderTokenUsage {
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SAMPLES = 10_000;
const samples: GatewayRequestSample[] = [];
const tokenUsageByProvider = new Map<string, ProviderTokenUsage>();

export function recordProviderTokenUsage(
  provider: string,
  inputTokens: number,
  outputTokens: number
): void {
  if (
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0 ||
    inputTokens + outputTokens === 0
  ) {
    return;
  }
  const current = tokenUsageByProvider.get(provider) ?? {
    inputTokens: 0,
    outputTokens: 0,
    requests: 0,
  };
  tokenUsageByProvider.set(provider, {
    inputTokens: current.inputTokens + inputTokens,
    outputTokens: current.outputTokens + outputTokens,
    requests: current.requests + 1,
  });
}

export function recordGatewayRequest(sample: GatewayRequestSample): void {
  samples.push(sample);
  pruneSamples(Date.now());
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function getGatewayMetrics(now = Date.now()): SystemMetrics {
  pruneSamples(now);
  const minuteAgo = now - 60_000;
  const recentSamples = samples.filter((sample) => sample.timestamp >= minuteAgo);
  const errors = samples.filter((sample) => sample.statusCode >= 400);
  const successful = samples.filter(
    (sample) => sample.statusCode >= 200 && sample.statusCode < 400
  );
  const currentHourStart = Math.floor(now / (60 * 60 * 1000)) * 60 * 60 * 1000;
  const hourlyRequestCounts = Array.from({ length: 24 }, (_, index) => {
    const hourStart = currentHourStart - (23 - index) * 60 * 60 * 1000;
    const hourEnd = hourStart + 60 * 60 * 1000;
    return samples.filter(
      (sample) => sample.timestamp >= hourStart && sample.timestamp < hourEnd
    ).length;
  });
  const providerRequestCounts: Record<string, number> = {};
  for (const sample of samples) {
    if (sample.provider) {
      providerRequestCounts[sample.provider] = (providerRequestCounts[sample.provider] ?? 0) + 1;
    }
  }

  return {
    rps: Number((recentSamples.length / 60).toFixed(3)),
    avgLatencyMs: successful.length
      ? Math.round(successful.reduce((total, sample) => total + sample.durationMs, 0) / successful.length)
      : 0,
    cacheHitRatio: null,
    errorRate: samples.length ? errors.length / samples.length : 0,
    totalRequests24h: samples.length,
    hourlyRequestCounts,
    sampleCount: samples.length,
    successfulRequestCount: successful.length,
    providerRequestCounts,
    providerTokenUsage: Object.fromEntries(tokenUsageByProvider),
    scope: "instance",
  };
}

function pruneSamples(now: number): void {
  const cutoff = now - WINDOW_MS;
  while (samples.length && samples[0].timestamp < cutoff) samples.shift();
}

export function clearGatewayMetricsForTests(): void {
  samples.length = 0;
  tokenUsageByProvider.clear();
}
