import type { ManagedProviderId } from "./providerVault";

export type ProviderHealthState = "healthy" | "degraded" | "unconfigured";

export interface ProviderHealthResult {
  provider: ManagedProviderId;
  state: ProviderHealthState;
  latencyMs: number | null;
  checkedAt: string;
  message: string;
}

const PROBE_TIMEOUT_MS = 8_000;

const providerProbeUrls: Record<ManagedProviderId, string> = {
  anthropic: "https://api.anthropic.com/v1/models?limit=1",
  openai: "https://api.openai.com/v1/models",
  deepseek: "https://api.deepseek.com/models",
  groq: "https://api.groq.com/openai/v1/models",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
};

export async function checkProviderHealth(
  provider: ManagedProviderId,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
  now = Date.now()
): Promise<ProviderHealthResult> {
  const checkedAt = new Date(now).toISOString();
  if (!apiKey?.trim()) {
    return {
      provider,
      state: "unconfigured",
      latencyMs: null,
      checkedAt,
      message: "Kredensial provider belum dikonfigurasi.",
    };
  }

  const url = providerProbeUrls[provider];
  const headers: Record<string, string> = { Accept: "application/json" };

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider === "gemini") {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      return {
        provider,
        state: "healthy",
        latencyMs,
        checkedAt,
        message: "Provider merespons pemeriksaan daftar model.",
      };
    }

    return {
      provider,
      state: "degraded",
      latencyMs,
      checkedAt,
      message:
        response.status === 401 || response.status === 403
          ? "Provider menolak kredensial. Periksa API key dan izin akun."
          : response.status === 429
            ? "Provider membatasi permintaan saat ini."
            : `Provider merespons HTTP ${response.status}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Pemeriksaan provider melewati batas waktu."
        : "Provider tidak dapat dijangkau dari server aplikasi.";
    return {
      provider,
      state: "degraded",
      latencyMs: Date.now() - startedAt,
      checkedAt,
      message,
    };
  }
}
