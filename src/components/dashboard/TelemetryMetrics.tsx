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
      statusColor: "text-emerald-400",
      accentBorder: "hover:border-[#C0549F]/40",
    },
    {
      label: "MEDIAN TTFT (EDGE)",
      value: `${metrics.avgTtftMs}`,
      unit: "ms",
      meta: "Global edge avg",
      submeta: "sin1: 14ms · iad1: 128ms",
      statusColor: "text-emerald-400",
      accentBorder: "hover:border-[#4A57B8]/40",
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
      statusColor: "text-purple-400",
      accentBorder: "hover:border-purple-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-2xl border border-white/10 bg-[#0A0C1E]/80 backdrop-blur-md p-4 flex flex-col justify-between transition-all duration-300 ${card.accentBorder}`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-[#A5AFDD] tracking-wider">
            <span>{card.label}</span>
            <span className={`text-[10px] font-mono ${card.statusColor}`}>●</span>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[#E9EDFB] tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-mono text-[#A5AFDD]/70 font-medium">
                {card.unit}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>{card.meta}</span>
            <span className="text-[#A5AFDD]/50 truncate ml-2">{card.submeta}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

