import type { UpstreamProviderId } from "../types";
import { getGuardrailsConfig, sanitizePii } from "../owner/guardrails";


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
 * or returns null when the upstream is unavailable. The route may use a
 * simulation only outside production.
 */
export async function forwardToUpstreamProvider(
  options: ForwardProxyOptions
): Promise<Response | null> {
  const { provider, apiKey, model, messages, system, temperature = 0.7, stream = true } = options;

  const guardrails = getGuardrailsConfig();
  const safeMessages = guardrails.maskPii
    ? messages.map((m) => ({ ...m, content: sanitizePii(m.content) }))
    : messages;
  const safeSystem = system && guardrails.maskPii ? sanitizePii(system) : system;


  if (!apiKey || apiKey.trim() === "") {
    return null; // Fallback to zero-buffer local stream engine
  }

  try {
    if (provider === "custom") {
      const privateServerUrl =
        process.env.PRIVATE_SERVER_URL || "http://localhost:5002";
      const formattedMessages = safeSystem
        ? [{ role: "system", content: safeSystem }, ...safeMessages]
        : safeMessages;

      const targetEndpoint = `${privateServerUrl.replace(/\/+$/, "")}/v1/chat/completions`;

      const privateRes = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && apiKey !== "configured" ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          stream,
        }),
      });

      if (privateRes.ok) {
        return privateRes;
      }
    } else if (provider === "anthropic") {
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
    } else if (provider === "gemini") {
      const contents = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        }));
      const endpoint = stream
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
        : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: { temperature },
        }),
      });

      if (geminiRes.ok) return geminiRes;
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
          ...(stream && provider === "openai"
            ? { stream_options: { include_usage: true } }
            : {}),
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
