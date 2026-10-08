"use client";

import React from "react";
import { Activity, Zap, Database, AlertTriangle } from "lucide-react";
import type { SystemMetrics } from "@/lib/types";

interface TelemetryMetricsProps {
  metrics: SystemMetrics;
}

export function TelemetryMetrics({ metrics }: TelemetryMetricsProps) {
  const cards = [
    {
      title: "Throughput (RPS)",
      value: `${metrics.rps} req/s`,
      change: "+12.4% vs 1h ago",
      icon: Activity,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
    {
      title: "Avg TTFT Latency",
      value: `${metrics.avgTtftMs} ms`,
      change: "Global edge avg",
      icon: Zap,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Prompt Cache Hit",
      value: `${(metrics.cacheHitRatio * 100).toFixed(1)}%`,
      change: "100% cost reduction",
      icon: Database,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      title: "Gateway Error Rate",
      value: `${(metrics.errorRate * 100).toFixed(2)}%`,
      change: "Auto-failover active",
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-[#121215] p-4 flex flex-col justify-between hover:border-white/20 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{card.title}</span>
              <div className={`p-1.5 rounded-md ${card.bgColor} ${card.borderColor} border`}>
                <Icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
                {card.value}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-1">
                {card.change}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
