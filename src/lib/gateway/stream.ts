/**
 * Zero-buffer SSE stream transformer with live TTFT and token count metrics.
 */

export interface StreamMetrics {
  startTime: number;
  ttftMs: number | null;
  totalTokens: number;
  durationMs: number;
}

/**
 * Creates an Anthropic-compatible SSE stream response.
 */
export function createAnthropicSseStream(
  textChunks: string[],
  model: string = "claude-3-7-sonnet"
): { stream: ReadableStream; getMetrics: () => StreamMetrics } {
  const startTime = Date.now();
  let ttftMs: number | null = null;
  let totalTokens = 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Initial event: message_start
      controller.enqueue(
        encoder.encode(
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: `msg_mvx_${Date.now()}`,
              type: "message",
              role: "assistant",
              model,
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 15, output_tokens: 1 },
            },
          })}\n\n`
        )
      );

      // 2. Initial block: content_block_start
      controller.enqueue(
        encoder.encode(
          `event: content_block_start\ndata: ${JSON.stringify({
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          })}\n\n`
        )
      );

      // 3. Stream text chunks
      for (const chunk of textChunks) {
        if (ttftMs === null) {
          ttftMs = Date.now() - startTime;
        }
        totalTokens += Math.max(1, Math.round(chunk.length / 4));

        controller.enqueue(
          encoder.encode(
            `event: content_block_delta\ndata: ${JSON.stringify({
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: chunk },
            })}\n\n`
          )
        );
      }

      // 4. Closing events
      controller.enqueue(
        encoder.encode(
          `event: content_block_stop\ndata: ${JSON.stringify({
            type: "content_block_stop",
            index: 0,
          })}\n\n`
        )
      );

      controller.enqueue(
        encoder.encode(
          `event: message_delta\ndata: ${JSON.stringify({
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: totalTokens },
          })}\n\n`
        )
      );

      controller.enqueue(
        encoder.encode(
          `event: message_stop\ndata: ${JSON.stringify({
            type: "message_stop",
          })}\n\n`
        )
      );

      controller.close();
    },
  });

  return {
    stream,
    getMetrics: () => ({
      startTime,
      ttftMs: ttftMs ?? Date.now() - startTime,
      totalTokens,
      durationMs: Date.now() - startTime,
    }),
  };
}
