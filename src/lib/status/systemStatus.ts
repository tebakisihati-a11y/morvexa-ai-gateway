/**
 * Public system status.
 *
 * The numbers reported here are derived from real configuration and process
 * state - not the illustrative telemetry used in the marketing preview. The
 * point of a status page is to be true on its worst day, so anything that is a
 * placeholder (upstream latency, synthetic RPS) is deliberately left out rather
 * than dressed up as a live measurement.
 *
 * Nothing here may leak a secret: the provider component reports a *count* of
 * configured credentials, never which provider holds one, and never a value.
 */

import { DEFAULT_PROVIDERS } from "../gateway/failover";
import { isEmailDeliveryConfigured } from "../email/send";
import { isDurableCustomerStore } from "../customer/durable";

export type ComponentState = "operational" | "degraded" | "not_configured";

export interface StatusComponent {
  id: string;
  name: string;
  state: ComponentState;
  /** One plain-language sentence the public can read. */
  detail: string;
}

export interface SystemStatus {
  /** Worst state across components, so the headline never over-claims. */
  state: ComponentState;
  generatedAt: string;
  uptimeSeconds: number;
  region: string;
  components: StatusComponent[];
}

/**
 * Environment variables that switch a provider from simulated to live.
 *
 * `custom` is intentionally absent: its "key" is the private-server sentinel
 * value, not a real upstream credential, so counting it would overstate how
 * many live providers are actually wired.
 */
const PROVIDER_KEY_ENV: Record<string, string | undefined> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
};

function configuredProviderCount(): number {
  return DEFAULT_PROVIDERS.reduce((count, provider) => {
    const envName = PROVIDER_KEY_ENV[provider.id];
    return envName && process.env[envName] ? count + 1 : count;
  }, 0);
}

function worstState(states: ComponentState[]): ComponentState {
  if (states.includes("degraded")) return "degraded";
  if (states.includes("not_configured")) return "not_configured";
  return "operational";
}

export function buildSystemStatus(): SystemStatus {
  const liveProviders = configuredProviderCount();
  const inChain = DEFAULT_PROVIDERS.filter((p) => p.isActive).length;

  const components: StatusComponent[] = [
    {
      id: "edge",
      name: "Gateway edge",
      state: "operational",
      detail:
        "Menerima permintaan /v1/messages dan /v1/chat/completions, memverifikasi API key, dan menegakkan batas RPM per kunci.",
    },
    {
      id: "routing",
      name: "Provider routing & failover",
      state: liveProviders > 0 ? "operational" : "degraded",
      detail:
        liveProviders > 0
          ? `${inChain} provider dalam rantai failover, ${liveProviders} di antaranya memakai kredensial upstream asli.`
          : `${inChain} provider dalam rantai failover, tetapi belum ada kredensial upstream. Permintaan dilayani oleh stream simulasi.`,
    },
    {
      id: "customer-store",
      name: "Penyimpanan akun kustomer",
      state: isDurableCustomerStore() ? "operational" : "degraded",
      detail: isDurableCustomerStore()
        ? "Akun, order dan aktivitas kustomer ditulis ke database persisten."
        : "Database persisten belum terhubung. Akun tersimpan di memori proses dan dapat hilang saat instance didaur ulang.",
    },
    {
      id: "email",
      name: "Email transaksional",
      state: isEmailDeliveryConfigured() ? "operational" : "degraded",
      detail: isEmailDeliveryConfigured()
        ? "Tautan verifikasi dan reset password dikirim lewat penyedia email."
        : "Belum ada penyedia email. Tautan verifikasi tertulis di log server dan tidak sampai ke kotak masuk.",
    },
  ];

  return {
    state: worstState(components.map((c) => c.state)),
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(typeof process.uptime === "function" ? process.uptime() : 0),
    region: process.env.VERCEL_REGION || "local",
    components,
  };
}
