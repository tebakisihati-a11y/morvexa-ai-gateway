"use client";

import React, { useState } from "react";
import type { UpstreamProviderId } from "@/lib/types";

export interface ProviderStatus {
  id: Exclude<UpstreamProviderId, "custom">;
  name: string;
  configured: boolean;
  source: "environment" | "vault" | "not_configured";
  maskedKey: string | null;
  updatedAt: string | null;
}

interface ProviderCredentialsCardProps {
  providers: ProviderStatus[];
  loading: boolean;
  busyProvider: string | null;
  error: string | null;
  notice: string | null;
  onSave: (id: ProviderStatus["id"], key: string) => Promise<boolean>;
  onDelete: (id: ProviderStatus["id"]) => Promise<void>;
}

export function ProviderCredentialsCard({
  providers,
  loading,
  busyProvider,
  error,
  notice,
  onSave,
  onDelete,
}: ProviderCredentialsCardProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const submit = async (provider: ProviderStatus) => {
    const apiKey = drafts[provider.id]?.trim();
    if (!apiKey) return;
    const saved = await onSave(provider.id, apiKey);
    if (saved) {
      setDrafts((current) => ({ ...current, [provider.id]: "" }));
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5]">
            Upstream Provider Credentials & Nodes
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Kredensial disimpan terenkripsi; nilai asli tidak pernah dikirim kembali ke browser.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#a1a1aa] border border-white/5 bg-black/40 px-2 py-0.5 rounded self-start sm:self-auto">
          AES-256-GCM
        </span>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-400">{error}</p>}
      {notice && <p role="status" className="mb-3 text-xs text-emerald-400">{notice}</p>}
      {loading ? (
        <p className="text-xs text-zinc-400">Memuat konfigurasi provider…</p>
      ) : (
      <div className="space-y-2.5">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 p-3 rounded border border-white/5 bg-black/40 hover:border-white/10 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-[#f4f4f5]">{p.name}</span>
                  <span className={`text-[10px] font-mono ${p.configured ? "text-emerald-400" : "text-amber-400"}`}>
                    {p.configured ? "configured" : "not configured"}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#71717a] mt-0.5">
                  {p.source === "environment"
                    ? "Dikelola melalui environment variables deployment"
                    : p.source === "vault"
                    ? `Vault terenkripsi · ${p.maskedKey}`
                    : "Belum ada kredensial"}
                </div>
              </div>
              {p.source === "vault" && p.updatedAt && (
                <time className="text-[10px] font-mono text-zinc-500" dateTime={p.updatedAt}>
                  Diperbarui {new Date(p.updatedAt).toLocaleString()}
                </time>
              )}
            </div>
            {p.source !== "environment" && (
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(p);
                }}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  value={drafts[p.id] ?? ""}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [p.id]: event.target.value,
                  }))}
                  placeholder={`Masukkan API key ${p.name}`}
                  aria-label={`API key ${p.name}`}
                  className="min-w-0 flex-1 rounded border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-[#f4f4f5] placeholder:text-[#71717a] focus:outline-none focus:border-[#a1a1aa]"
                />
                <button
                  type="submit"
                  disabled={!drafts[p.id]?.trim() || busyProvider === p.id}
                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-300 disabled:opacity-50"
                >
                  {busyProvider === p.id ? "Menyimpan…" : p.configured ? "Ganti key" : "Simpan key"}
                </button>
                {p.source === "vault" && (
                  <button
                    type="button"
                    disabled={busyProvider === p.id}
                    onClick={() => void onDelete(p.id)}
                    className="rounded border border-red-500/20 px-3 py-2 text-xs font-mono text-red-300 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                )}
              </form>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
