"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type StatusState = "checking" | "operational" | "degraded" | "not_configured" | "unavailable";

const STATUS_LABELS: Record<StatusState, string> = {
  checking: "memeriksa…",
  operational: "konfigurasi operasional",
  degraded: "perlu perhatian",
  not_configured: "belum dikonfigurasi",
  unavailable: "status tidak tersedia",
};

export function EdgeStatusRadar() {
  const [state, setState] = useState<StatusState>("checking");

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await apiFetch("/api/v1/status");
        if (!response.ok) throw new Error("Status request failed.");
        const data = await response.json();
        const value: StatusState = ["operational", "degraded", "not_configured"].includes(data.state)
          ? data.state
          : "unavailable";
        if (!cancelled) setState(value);
      } catch {
        if (!cancelled) setState("unavailable");
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const isOperational = state === "operational";
  return (
    <div
      className="flex items-center gap-2.5 rounded border border-white/10 bg-[#0e0e11] px-2.5 py-1 text-xs"
      title="Status berdasarkan konfigurasi layanan, bukan probe latensi regional atau koneksi AI langsung."
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOperational ? "bg-emerald-400" : state === "checking" ? "bg-zinc-400" : "bg-amber-400"
        }`}
      />
      <span className={`font-mono text-[11px] ${isOperational ? "text-emerald-300" : "text-amber-300"}`} role="status" aria-live="polite">
        sistem: {STATUS_LABELS[state]}
      </span>
    </div>
  );
}
