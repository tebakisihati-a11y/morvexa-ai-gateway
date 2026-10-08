import type { UpstreamProviderId } from "../types";

export interface ForwardProxyOptions {
  provider: UpstreamProviderId;
  apiKey?: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

/**
 * Forwards requests to real upstream AI providers when credentials exist,
 * or returns null to use the high-performance local simulation stream.
 */
export async function forwardToUpstreamProvider(
  options: ForwardProxyOptions
): Promise<Response | null> {
  const { provider, apiKey, model, messages, system, temperature = 0.7, stream = true } = options;

  if (!apiKey || apiKey.trim() === "") {
    return null; // Fallback to zero-buffer local stream engine
  }

  try {
    if (provider === "anthropic") {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system,
          messages,
          max_tokens: 4096,
          temperature,
          stream,
        }),
      });

      if (anthropicRes.ok) {
        return anthropicRes;
      }
    } else if (provider === "deepseek" || provider === "openai" || provider === "groq") {
      const baseUrl =
        provider === "deepseek"
          ? "https://api.deepseek.com/v1/chat/completions"
          : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const formattedMessages = system
        ? [{ role: "system", content: system }, ...messages]
        : messages;

      const aiRes = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          stream,
        }),
      });

      if (aiRes.ok) {
        return aiRes;
      }
    }
  } catch (error) {
    console.error(`[Morvexa] Upstream call failed for ${provider}:`, error);
  }

  return null;
}
