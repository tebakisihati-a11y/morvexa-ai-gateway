"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ProviderCredentialsCard, type ProviderStatus } from "./ProviderCredentialsCard";
import { FailoverFlowMap } from "./FailoverFlowMap";
import { apiFetch } from "@/lib/api/client";

export function RoutingTab() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

      <FailoverFlowMap />

      <ProviderCredentialsCard
        providers={providers}
        loading={loading}
        busyProvider={busyProvider}
        error={error}
        notice={notice}
        onSave={saveProvider}
        onDelete={deleteProvider}
      />
    </div>
  );
}
