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
    <div className="flex items-center gap-2.5 text-xs border border-white/10 bg-[#0e0e11] px-2.5 py-1 rounded">
      <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-zinc-300">mesh: operational</span>
      </div>

      <div className="h-3 w-[1px] bg-white/10 hidden sm:block" />

      <div className="hidden sm:flex items-center gap-2.5">
        {regions.map((reg) => (
          <div key={reg.code} className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
            <span className="text-zinc-500">{reg.code}:</span>
            <span className="text-zinc-300">{reg.currentLatency}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
