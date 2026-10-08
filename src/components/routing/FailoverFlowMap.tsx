"use client";

import React from "react";
import { ArrowRight, GitBranch, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";

export function FailoverFlowMap() {
  const pipeline = [
    {
      step: 1,
      type: "Primary Upstream",
      provider: "Anthropic Claude 3.7",
      status: "Active (Default)",
      latency: "142ms",
      badgeColor: "bg-orange-500/10 border-orange-500/20 text-orange-400",
      description: "Direct upstream connection via SSE zero-buffer stream.",
    },
    {
      step: 2,
      type: "Fallback Hop 1",
      provider: "DeepSeek V3 (Chat)",
      status: "Triggered on 429 / 5xx",
      latency: "98ms",
      badgeColor: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      description: "Auto-routes in <150ms if Anthropic rate limit hits.",
    },
    {
      step: 3,
      type: "Fallback Hop 2",
      provider: "Groq LPU (Ultra-Fast)",
      status: "Emergency Circuit",
      latency: "45ms",
      badgeColor: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      description: "Sub-50ms emergency token generation fallback.",
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-orange-400" />
            <span>Intelligent Multi-Provider Failover Mesh</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Zero-downtime execution graph ensuring 99.99% availability during provider outages
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
          Failover Latency: &lt;150ms
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {pipeline.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-white/10 bg-black/40 p-4 relative flex flex-col justify-between hover:border-white/20 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Node #{item.step}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                  {item.type}
                </span>
              </div>

              <div className="font-semibold text-zinc-200 text-sm mb-1">{item.provider}</div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">Latency:</span>
              <span className="text-zinc-200 font-bold">{item.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
