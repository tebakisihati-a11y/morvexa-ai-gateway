"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ProviderCredentialsCard, type ProviderStatus } from "./ProviderCredentialsCard";
import { FailoverFlowMap } from "./FailoverFlowMap";
import { apiFetch } from "@/lib/api/client";
import type { ProviderHealthResult } from "@/lib/gateway/providerHealth";

export function RoutingTab() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [emailTestAddress, setEmailTestAddress] = useState("");
  const [emailTestBusy, setEmailTestBusy] = useState(false);

  const loadProviders = useCallback(async () => {
    setError(null);
    try {
      const response = await apiFetch("/api/owner/providers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat provider.");
      setProviders(data.providers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat provider.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const saveProvider = async (id: ProviderStatus["id"], apiKey: string): Promise<boolean> => {
    setBusyProvider(id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch("/api/owner/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id, apiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan API key.");
      setProviders(data.providers);
      setNotice(`Kredensial ${id} tersimpan. Gateway akan menggunakannya untuk permintaan yang dirutekan ke provider ini.`);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan API key.");
      return false;
    } finally {
      setBusyProvider(null);
    }
  };

  const deleteProvider = async (id: ProviderStatus["id"]) => {
    if (!window.confirm(`Hapus kredensial vault untuk ${id}?`)) return;
    setBusyProvider(id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch(`/api/owner/providers/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus API key.");
      setProviders(data.providers);
      setNotice(`Kredensial ${id} telah dihapus dari vault.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus API key.");
    } finally {
      setBusyProvider(null);
    }
  };

  const testProvider = async (id: ProviderStatus["id"]) => {
    setTestingProvider(id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch(`/api/owner/providers/${id}/test`, { method: "POST" });
      const data = await response.json();
      if (!data.result) throw new Error(data.error || "Pemeriksaan provider gagal.");
      const result = data.result as ProviderHealthResult;
      setProviders((current) => current.map((provider) =>
        provider.id === id ? { ...provider, health: result } : provider
      ));
      setNotice(result.message);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Pemeriksaan provider gagal.");
    } finally {
      setTestingProvider(null);
    }
  };

  const sendEmailTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailTestBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch("/api/owner/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTestAddress }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Email tes gagal dikirim.");
      setNotice(data.message);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Email tes gagal dikirim.");
    } finally {
      setEmailTestBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#f4f4f5] tracking-tight">
          Provider AI & Kredensial
        </h2>
        <p className="text-xs text-[#a1a1aa] mt-0.5">
          API key hanya dikirim ke server, dienkripsi sebelum masuk database, dan tidak pernah ditampilkan kembali.
        </p>
      </div>

      <FailoverFlowMap providers={providers} />

      <ProviderCredentialsCard
        providers={providers}
        loading={loading}
        busyProvider={busyProvider}
        error={error}
        notice={notice}
        onSave={saveProvider}
        onDelete={deleteProvider}
        onTest={testProvider}
        testingProvider={testingProvider}
      />
      <section className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
        <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5]">
          Verifikasi email transaksi
        </h3>
        <p className="mt-1 mb-3 text-xs text-[#a1a1aa]">
          Kirim satu email tes ke alamat yang Anda kuasai. Ini hanya memeriksa penerimaan provider, bukan menjamin inbox; periksa log Brevo dan folder spam. Pengiriman menggunakan kuota gratis provider yang tersedia.
        </p>
        <form onSubmit={(event) => void sendEmailTest(event)} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            maxLength={254}
            value={emailTestAddress}
            onChange={(event) => setEmailTestAddress(event.target.value)}
            placeholder="Alamat email Anda"
            aria-label="Alamat email untuk tes"
            className="min-w-0 flex-1 rounded border border-white/10 bg-black/60 px-3 py-2 text-xs text-[#f4f4f5] placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={emailTestBusy || !emailTestAddress.trim()}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-300 disabled:opacity-50"
          >
            {emailTestBusy ? "Mengirim…" : "Kirim email tes"}
          </button>
        </form>
      </section>
      <p className="text-xs text-zinc-500">
        Pemeriksaan hanya meminta daftar model, bukan menjalankan prompt atau inferensi. Tetap periksa ketentuan provider: penggunaan AI dan kredensialnya mungkin dikenai biaya, walau gateway Morvexa memakai layanan gratis.
      </p>
    </div>
  );
}
