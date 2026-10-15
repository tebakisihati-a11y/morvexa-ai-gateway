"use client";

import React from "react";
import type { SystemMetrics } from "@/lib/types";

interface TelemetryMetricsProps {
  metrics: SystemMetrics;
}

export function TelemetryMetrics({ metrics }: TelemetryMetricsProps) {
  const cards = [
    {
      label: "INGRESS THROUGHPUT",
      value: `${metrics.rps}`,
      unit: "req/s",
      meta: "+12.4% vs 1h peak",
      submeta: "128,940 reqs / 24h",
      statusColor: "text-[#10b981]",
      accentBorder: "hover:border-[#f97316]/40",
    },
    {
      label: "MEDIAN TTFT (EDGE)",
      value: `${metrics.avgTtftMs}`,
      unit: "ms",
      meta: "Global edge avg",
      submeta: "sin1: 14ms · iad1: 128ms",
      statusColor: "text-[#10b981]",
      accentBorder: "hover:border-[#c2410c]/40",
    },
    {
      label: "CACHE HIT RATIO",
      value: `${(metrics.cacheHitRatio * 100).toFixed(1)}`,
      unit: "%",
      meta: "36,103 cached",
      submeta: "Zero upstream billing",
      statusColor: "text-cyan-400",
      accentBorder: "hover:border-cyan-500/40",
    },
    {
      label: "GATEWAY ERROR RATE",
      value: `${(metrics.errorRate * 100).toFixed(2)}`,
      unit: "%",
      meta: "Circuit breaker: normal",
      submeta: "Auto-failover ready",
      statusColor: "text-[#f97316]",
      accentBorder: "hover:border-[#f97316]/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
    </div>
  );
}

