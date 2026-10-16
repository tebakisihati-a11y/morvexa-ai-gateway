"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

/**
 * Customer self-service API keys.
 *
 * Replaces the card that only showed the *format* of a key. Every call is
 * scoped to the signed-in session server-side, so this component never names a
 * customer and cannot reach another account's keys.
 */

interface ApiKeyView {
  id: string;
  name: string;
  maskedKey: string;
  rateLimitRpm: number;
  dailyTokenLimit: number;
  createdAt: string;
  isActive: boolean;
  healthStatus?: string;
}

export function CustomerApiKeys() {
  const [keys, setKeys] = useState<ApiKeyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/customer/api-keys");
      if (!response.ok) {
        setError("Tidak dapat memuat daftar API key.");
        return;
      }
      const body = await response.json();
      setKeys(body.keys ?? []);
      setError(null);
    } catch {
      setError("Tidak dapat memuat daftar API key.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 3) {
      setError("Nama key minimal 3 karakter.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await apiFetch("/api/customer/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Gagal membuat API key.");
        return;
      }
      setRevealedSecret(body.rawSecret ?? null);
      setNewName("");
      await load();
    } catch {
      setError("Gagal membuat API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await apiFetch(`/api/customer/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Gagal mencabut API key.");
        return;
      }
      await load();
    } catch {
      setError("Gagal mencabut API key.");
    } finally {
      setBusyId(null);
    }
  }

  async function copySecret() {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Tidak dapat menyalin otomatis. Salin manual dari kotak di atas.");
    }
  }

  return (
    <section className="rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-lg font-bold text-[#f4f4f5]">API Key Saya</h2>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-[#a1a1aa]">
            Kelola kunci akses gateway Anda. Secret hanya ditampilkan sekali saat dibuat, lalu
            disimpan sebagai hash — jika hilang, buat kunci baru lalu cabut yang lama.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nama key, mis. Produksi"
            maxLength={60}
            className="w-full rounded-lg border border-[#f4f4f5]/15 bg-[#08080a] px-3 py-2 text-xs text-[#f4f4f5] outline-none transition-colors placeholder:text-[#71717a] focus:border-[#f97316]/50 sm:w-48"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-xs font-semibold text-[#08080a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Buat Key
          </button>
        </form>
      </div>

      {revealedSecret && (
        <div className="mt-5 rounded-lg border border-[#f97316]/40 bg-[#f97316]/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#fdba74]">
            <AlertTriangle className="h-3.5 w-3.5" />
            Salin sekarang — secret tidak ditampilkan lagi
          </div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded border border-[#f4f4f5]/10 bg-[#08080a] px-3 py-2 font-mono text-[12px] text-[#fdba74]">
              {revealedSecret}
            </code>
            <button
              onClick={copySecret}
              className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[#f4f4f5]/15 px-2.5 py-2 text-[11px] text-[#a1a1aa] transition-colors hover:text-[#f4f4f5]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#f97316]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-xs text-[#f87171]" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-[#71717a]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat kunci…
          </p>
        ) : keys.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#f4f4f5]/15 px-4 py-6 text-center text-xs text-[#71717a]">
            Belum ada API key. Buat satu, atau beli paket token di atas dan kuncinya terbit otomatis.
          </p>
        ) : (
          <ul className="divide-y divide-[#f4f4f5]/8 rounded-lg border border-[#f4f4f5]/10">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[#f4f4f5]">{key.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                        key.isActive
                          ? "bg-[#f97316]/10 text-[#f97316]"
                          : "bg-[#71717a]/15 text-[#71717a]"
                      }`}
                    >
                      {key.isActive ? "AKTIF" : "DICABUT"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#71717a]">
                    <span className="text-[#a1a1aa]">{key.maskedKey}</span>
                    <span>{key.rateLimitRpm} RPM</span>
                    <span>{key.dailyTokenLimit.toLocaleString("id-ID")} token/hari</span>
                    <span>{new Date(key.createdAt).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>

                {key.isActive && (
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={busyId === key.id}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded border border-[#f4f4f5]/15 px-3 py-1.5 text-[11px] text-[#a1a1aa] transition-colors hover:border-[#f87171]/40 hover:text-[#f87171] disabled:opacity-50 sm:self-auto"
                  >
                    {busyId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Cabut
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
