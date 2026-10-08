"use client";

import React, { useEffect, useState } from "react";
import { Activity, Wifi } from "lucide-react";

interface RegionPing {
  code: string;
  name: string;
  baseLatency: number;
  currentLatency: number;
}

export function EdgeStatusRadar() {
  const [regions, setRegions] = useState<RegionPing[]>([
    { code: "SIN", name: "Singapore", baseLatency: 14, currentLatency: 14 },
    { code: "FRA", name: "Frankfurt", baseLatency: 86, currentLatency: 86 },
    { code: "IAD", name: "Virginia", baseLatency: 128, currentLatency: 128 },
    { code: "NRT", name: "Tokyo", baseLatency: 42, currentLatency: 42 },
  ]);

  // Subtle real-time latency fluctuations for telemetry dynamism
  useEffect(() => {
    const interval = setInterval(() => {
      setRegions((prev) =>
        prev.map((r) => ({
          ...r,
          currentLatency: Math.max(8, r.baseLatency + Math.floor(Math.random() * 7 - 3)),
        }))
      );
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs border border-white/10 bg-[#121215] px-3 py-1.5 rounded-lg shadow-sm">
      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-mono tracking-tight text-zinc-300">EDGE OPERATIONAL</span>
      </div>

      <div className="h-3 w-[1px] bg-white/10 hidden sm:block" />

      <div className="hidden sm:flex items-center gap-3">
        {regions.map((reg) => (
          <div key={reg.code} className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
            <span className="text-zinc-500">{reg.code}:</span>
            <span className="text-zinc-200">{reg.currentLatency}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
