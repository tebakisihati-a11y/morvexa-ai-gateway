import { recordProviderTokenUsage } from "./telemetry";
import type { UpstreamProviderId } from "../types";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

function parseUsagePayload(value: unknown): Partial<TokenUsage> {
  if (!value || typeof value !== "object") return {};
  const payload = value as Record<string, unknown>;
  const message = payload.message && typeof payload.message === "object"
    ? payload.message as Record<string, unknown>
    : undefined;
  const usage = payload.usage && typeof payload.usage === "object"
    ? payload.usage as Record<string, unknown>
    : message?.usage && typeof message.usage === "object"
      ? message.usage as Record<string, unknown>
      : payload.usageMetadata && typeof payload.usageMetadata === "object"
        ? payload.usageMetadata as Record<string, unknown>
        : undefined;
  if (!usage) return {};

  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount;
  return {
    ...(typeof inputTokens === "number" && Number.isSafeInteger(inputTokens) && inputTokens >= 0
      ? { inputTokens }
      : {}),
    ...(typeof outputTokens === "number" && Number.isSafeInteger(outputTokens) && outputTokens >= 0
      ? { outputTokens }
      : {}),
  };
}

function addUsage(target: TokenUsage, update: Partial<TokenUsage>): void {
  if (update.inputTokens !== undefined) target.inputTokens = update.inputTokens;
  if (update.outputTokens !== undefined) target.outputTokens = update.outputTokens;
}

function observeSseChunk(text: string, state: { pending: string; usage: TokenUsage }): void {
  const lines = `${state.pending}${text}`.split(/\r?\n/);
  state.pending = lines.pop() ?? "";
  if (state.pending.length > 64 * 1024) state.pending = "";

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      addUsage(state.usage, parseUsagePayload(JSON.parse(data)));
    } catch {
      // Not every SSE data event is JSON; only provider usage events are relevant.
    }
  }
}

/**
 * Observes provider-reported usage while forwarding the original response body
 * unchanged. It never estimates tokens from prompt or completion text.
 */
export function trackProviderUsage(
  response: Response,
  provider: UpstreamProviderId,
  onUsage: (provider: UpstreamProviderId, usage: TokenUsage) => void = (id, usage) =>
    recordProviderTokenUsage(id, usage.inputTokens, usage.outputTokens)
): Response {
  if (!response.body) return response;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("text/event-stream")) {
    const clone = response.clone();
    void clone.json().then((body: unknown) => {
      const parsed = parseUsagePayload(body);
      if (parsed.inputTokens !== undefined && parsed.outputTokens !== undefined) {
        onUsage(provider, parsed as TokenUsage);
      }
    }).catch(() => undefined);
    return response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const state = { pending: "", usage: { inputTokens: 0, outputTokens: 0 } };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (state.usage.inputTokens || state.usage.outputTokens) {
      onUsage(provider, state.usage);
    }
  };

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          observeSseChunk(`${decoder.decode()}\n`, state);
          finish();
          controller.close();
          return;
        }
        observeSseChunk(decoder.decode(result.value, { stream: true }), state);
        controller.enqueue(result.value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
