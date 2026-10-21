"use client";

import React from "react";
import { GitBranch } from "lucide-react";
import type { ProviderStatus } from "./ProviderCredentialsCard";

interface FailoverFlowMapProps {
  providers: ProviderStatus[];
}

export function FailoverFlowMap({ providers }: FailoverFlowMapProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
      <div className="mb-4 border-b border-white/5 pb-3">
        <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5]">
          <GitBranch className="h-3.5 w-3.5 text-[#a1a1aa]" />
          Status provider & failover
        </h3>
        <p className="mt-1 text-xs text-[#a1a1aa]">
          Status koneksi hanya berubah setelah Anda menjalankan uji koneksi. Latensi adalah waktu pemeriksaan daftar model, bukan latensi generasi AI.
        </p>
      </div>
      {providers.length === 0 ? (
        <p className="text-xs text-zinc-400">Memuat status provider…</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => {
            const checked = provider.health;
            const tone = !provider.configured
              ? "text-zinc-400"
              : checked?.state === "healthy"
                ? "text-emerald-300"
                : checked
                  ? "text-amber-300"
                  : "text-zinc-400";
            const label = !provider.configured
              ? "Belum dikonfigurasi"
              : checked?.state === "healthy"
                ? "Tersambung"
                : checked
                  ? "Perlu diperiksa"
                  : "Belum diuji";
            return (
              <li key={provider.id} className="rounded border border-white/10 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[#f4f4f5]">{provider.name}</span>
                  <span className={`text-[10px] font-mono ${tone}`}>{label}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {checked
                    ? `${checked.latencyMs === null ? "—" : `${checked.latencyMs} ms`} · ${new Date(checked.checkedAt).toLocaleString()}`
                    : provider.configured
                      ? "Jalankan uji koneksi untuk memeriksa kredensial."
                      : "Tambahkan kredensial provider untuk mengaktifkan rute."}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
