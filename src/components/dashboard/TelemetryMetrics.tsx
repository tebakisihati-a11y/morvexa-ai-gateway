"use client";

import React from "react";
import type { SystemMetrics } from "@/lib/types";

interface TelemetryMetricsProps {
  metrics: SystemMetrics;
}

export function TelemetryMetrics({ metrics }: TelemetryMetricsProps) {
  const cards = [
    {
      label: "GATEWAY REQUEST RATE",
      value: metrics.rps.toFixed(3),
      unit: "req/s",
      meta: `${metrics.sampleCount} sampel`,
      submeta: "60 detik terakhir",
      statusColor: "text-cyan-400",
      accentBorder: "hover:border-[#f97316]/40",
    },
    {
      label: "LATENSI RESPONSE RATA-RATA",
      value: `${metrics.avgLatencyMs}`,
      unit: "ms",
      meta: `${metrics.successfulRequestCount} response berhasil`,
      submeta: "Respons handler berhasil",
      statusColor: "text-cyan-400",
      accentBorder: "hover:border-[#c2410c]/40",
    },
    {
      label: "CACHE HIT RATIO",
      value: metrics.cacheHitRatio === null ? "—" : `${(metrics.cacheHitRatio * 100).toFixed(1)}`,
      unit: metrics.cacheHitRatio === null ? "" : "%",
      meta: metrics.cacheHitRatio === null ? "Cache belum aktif" : "Request tersaji dari cache",
      submeta: metrics.cacheHitRatio === null ? "Tidak ada cache yang diukur" : "Rasio dalam sampel",
      statusColor: "text-zinc-400",
      accentBorder: "hover:border-cyan-500/40",
    },
    {
      label: "HTTP ERROR RATE",
      value: `${(metrics.errorRate * 100).toFixed(2)}`,
      unit: "%",
      meta: `${metrics.totalRequests24h} request`,
      submeta: metrics.scope === "instance" ? "HTTP 4xx/5xx · instance ini · 24 jam" : "HTTP 4xx/5xx · 24 jam",
      statusColor: metrics.errorRate > 0.05 ? "text-red-400" : "text-emerald-400",
      accentBorder: "hover:border-[#f97316]/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <p className="sr-only" aria-live="polite">
        Metrik diperbarui dari {metrics.sampleCount} sampel pada {metrics.scope === "instance" ? "instance ini" : "deployment"}.
      </p>
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-lg border border-white/10 bg-[#0e0e11]/80 p-4 flex flex-col justify-between transition-all duration-300 ${card.accentBorder}`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa] tracking-wider">
            <span>{card.label}</span>
            <span className={`text-[10px] font-mono ${card.statusColor}`}>●</span>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[#f4f4f5] tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-mono text-[#a1a1aa]/70 font-medium">
                {card.unit}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#71717a]">
            <span>{card.meta}</span>
            <span className="text-[#a1a1aa]/50 truncate ml-2">{card.submeta}</span>
          </div>
        </div>
      ))}
      {Object.keys(metrics.providerRequestCounts).length > 0 && (
        <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-white/10 bg-[#0e0e11]/80 p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#a1a1aa]">
            Request berhasil menurut provider · instance ini · 24 jam
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.entries(metrics.providerRequestCounts).map(([provider, count]) => (
              <li key={provider} className="rounded border border-white/10 px-2 py-1 text-xs font-mono text-[#f4f4f5]">
                {provider}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
