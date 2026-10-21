import {
  isSupabaseAdminConfigured,
  getSupabaseAdminClient,
} from "../supabase/client";
import {
  decryptProviderSecret,
  encryptProviderSecret,
  maskProviderKey,
  type EncryptedVaultPayload,
} from "./vault";
import type { UpstreamProviderId } from "../types";

export type ManagedProviderId = Exclude<UpstreamProviderId, "custom">;
export type ProviderCredentialSource = "environment" | "vault" | "not_configured";

export interface ProviderCredentialStatus {
  id: ManagedProviderId;
  name: string;
  configured: boolean;
  source: ProviderCredentialSource;
  maskedKey: string | null;
  updatedAt: string | null;
}

interface ProviderCredentialRow extends EncryptedVaultPayload {
  provider: ManagedProviderId;
  masked_key: string;
  updated_at: string;
}

const PROVIDERS: Array<{
  id: ManagedProviderId;
  name: string;
  envName: string;
}> = [
  { id: "anthropic", name: "Anthropic", envName: "ANTHROPIC_API_KEY" },
  { id: "openai", name: "OpenAI", envName: "OPENAI_API_KEY" },
  { id: "deepseek", name: "DeepSeek", envName: "DEEPSEEK_API_KEY" },
  { id: "groq", name: "Groq", envName: "GROQ_API_KEY" },
  { id: "gemini", name: "Google Gemini", envName: "GEMINI_API_KEY" },
];

let cachedCredentials: Map<ManagedProviderId, ProviderCredentialRow> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function providerConfig(provider: string) {
  return PROVIDERS.find((candidate) => candidate.id === provider);
}

function environmentCredential(provider: ManagedProviderId): string | undefined {
  const config = providerConfig(provider);
  const value = config ? process.env[config.envName]?.trim() : "";
  return value || undefined;
}

async function readCredentialRows(): Promise<Map<ManagedProviderId, ProviderCredentialRow>> {
  if (cachedCredentials && cacheExpiresAt > Date.now()) return cachedCredentials;
  if (!isSupabaseAdminConfigured) {
    throw new Error("Provider credential storage requires Supabase service-role configuration.");
  }

  const client = await getSupabaseAdminClient();
  if (!client) throw new Error("Supabase provider credential storage is unavailable.");

  const { data, error } = await client
    .from("provider_credentials")
    .select("provider,cipher_text,iv,auth_tag,key_version,masked_key,updated_at");
  if (error) {
    throw new Error(`Unable to read provider credentials: ${error.message}`);
  }

  cachedCredentials = new Map(
    (data ?? []).map((row: Record<string, string>) => [
      row.provider as ManagedProviderId,
      {
        provider: row.provider as ManagedProviderId,
        cipherText: row.cipher_text,
        iv: row.iv,
        authTag: row.auth_tag,
        keyVersion: row.key_version,
        masked_key: row.masked_key,
        updated_at: row.updated_at,
      },
    ])
  );
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedCredentials;
}

export async function listProviderCredentialStatuses(): Promise<ProviderCredentialStatus[]> {
  const rows = isSupabaseAdminConfigured
    ? await readCredentialRows()
    : new Map<ManagedProviderId, ProviderCredentialRow>();
  return PROVIDERS.map(({ id, name }) => {
    const environmentKey = environmentCredential(id);
    const stored = rows.get(id);
    return {
      id,
      name,
      configured: Boolean(environmentKey || stored),
      source: environmentKey ? "environment" : stored ? "vault" : "not_configured",
      maskedKey: environmentKey
        ? maskProviderKey(environmentKey)
        : stored?.masked_key ?? null,
      updatedAt: environmentKey ? null : stored?.updated_at ?? null,
    };
  });
}

export async function getProviderCredential(
  provider: ManagedProviderId
): Promise<string | undefined> {
  const environmentKey = environmentCredential(provider);
  if (environmentKey) return environmentKey;
  if (!isSupabaseAdminConfigured) return undefined;

  const row = (await readCredentialRows()).get(provider);
  if (!row) return undefined;
  if (row.keyVersion !== "v1") {
    throw new Error(`Unsupported provider credential version for ${provider}.`);
  }

  return decryptProviderSecret({
    cipherText: row.cipherText,
    iv: row.iv,
    authTag: row.authTag,
    keyVersion: row.keyVersion,
  });
}

export async function saveProviderCredential(
  provider: ManagedProviderId,
  secret: string
): Promise<void> {
  if (!providerConfig(provider)) throw new Error("Unsupported provider.");
  if (environmentCredential(provider)) {
    throw new Error("This provider is configured in deployment environment variables.");
  }
  if (!isSupabaseAdminConfigured) {
    throw new Error("Provider credential storage requires Supabase service-role configuration.");
  }
  const normalizedSecret = secret.trim();
  if (normalizedSecret.length < 8 || normalizedSecret.length > 4096) {
    throw new Error("Provider API key must be between 8 and 4096 characters.");
  }

  const encrypted = encryptProviderSecret(normalizedSecret);
  const client = await getSupabaseAdminClient();
  if (!client) throw new Error("Supabase provider credential storage is unavailable.");

  const { error } = await client.from("provider_credentials").upsert(
    {
      provider,
      cipher_text: encrypted.cipherText,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: encrypted.keyVersion,
      masked_key: maskProviderKey(normalizedSecret),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );
  if (error) throw new Error(`Unable to save provider credential: ${error.message}`);
  invalidateProviderCredentialCache();
}

export async function deleteProviderCredential(provider: ManagedProviderId): Promise<void> {
  if (!providerConfig(provider)) throw new Error("Unsupported provider.");
  if (environmentCredential(provider)) {
    throw new Error("This provider is configured in deployment environment variables.");
  }
  if (!isSupabaseAdminConfigured) {
    throw new Error("Provider credential storage requires Supabase service-role configuration.");
  }

  const client = await getSupabaseAdminClient();
  if (!client) throw new Error("Supabase provider credential storage is unavailable.");
  const { error } = await client.from("provider_credentials").delete().eq("provider", provider);
  if (error) throw new Error(`Unable to delete provider credential: ${error.message}`);
  invalidateProviderCredentialCache();
}

export function isManagedProviderId(value: string): value is ManagedProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}

export function invalidateProviderCredentialCache(): void {
  cachedCredentials = null;
  cacheExpiresAt = 0;
}
