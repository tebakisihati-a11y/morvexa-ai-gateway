import { afterEach, describe, expect, it, vi } from "vitest";
import { clearGatewayMetricsForTests, getGatewayMetrics } from "../src/lib/gateway/telemetry";
import { trackProviderUsage, type TokenUsage } from "../src/lib/gateway/usageTracking";

afterEach(() => clearGatewayMetricsForTests());

describe("provider-reported token tracking", () => {
  it("tracks Anthropic SSE usage while passing every original byte through unchanged", async () => {
    const original =
      'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":19}}}\n\n' +
      'event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":7}}\n\n';
    const onUsage = vi.fn<(provider: string, usage: TokenUsage) => void>();
    const response = trackProviderUsage(
      new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(original.slice(0, 41)));
          controller.enqueue(new TextEncoder().encode(original.slice(41)));
          controller.close();
        },
      }), { headers: { "Content-Type": "text/event-stream" } }),
      "anthropic",
      onUsage
    );

    expect(await response.text()).toBe(original);
    expect(onUsage).toHaveBeenCalledWith("anthropic", { inputTokens: 19, outputTokens: 7 });
  });

  it("tracks JSON usage from OpenAI-compatible and Gemini responses", async () => {
    const onUsage = vi.fn<(provider: string, usage: TokenUsage) => void>();
    const response = trackProviderUsage(
      new Response(JSON.stringify({
        usage: { prompt_tokens: 25, completion_tokens: 9 },
      }), { headers: { "Content-Type": "application/json" } }),
      "openai",
      onUsage
    );

    expect(await response.json()).toEqual({ usage: { prompt_tokens: 25, completion_tokens: 9 } });
    await vi.waitFor(() => expect(onUsage).toHaveBeenCalledWith(
      "openai",
      { inputTokens: 25, outputTokens: 9 }
    ));
  });

  it("does not estimate tokens when the provider response has no usage metadata", async () => {
    const onUsage = vi.fn();
    const response = trackProviderUsage(
      new Response(JSON.stringify({ choices: [{ message: { content: "answer" } }] }), {
        headers: { "Content-Type": "application/json" },
      }),
      "openai",
      onUsage
    );

    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onUsage).not.toHaveBeenCalled();
    expect(getGatewayMetrics().providerTokenUsage).toEqual({});
  });
});
