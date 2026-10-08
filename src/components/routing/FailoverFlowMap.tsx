"use client";

import React from "react";
import { GitBranch } from "lucide-react";

export function FailoverFlowMap() {
  const pipeline = [
    {
      step: 1,
      type: "Local Mesh",
      provider: "Private Server (localhost:5002)",
      status: "Local / Private Node",
      latency: "8ms",
      statusDot: "bg-purple-400",
      description: "Direct connection to your private local server or local LLM engine.",
    },
    {
      step: 2,
      type: "Primary Upstream",
      provider: "Anthropic Claude 3.7",
      status: "Active (Managed)",
      latency: "142ms",
      statusDot: "bg-emerald-400",
      description: "Direct upstream connection via SSE zero-buffer stream.",
    },
    {
      step: 3,
      type: "Fallback Hop 1",
      provider: "DeepSeek V3 (Chat)",
      status: "Triggered on 429 / 5xx",
      latency: "98ms",
      statusDot: "bg-blue-400",
      description: "Auto-routes in <150ms if primary provider rate limit hits.",
    },
    {
      step: 4,
      type: "Fallback Hop 2",
      provider: "Groq LPU (Ultra-Fast)",
      status: "Emergency Circuit",
      latency: "45ms",
      statusDot: "bg-emerald-400",
      description: "Sub-50ms emergency token generation fallback.",
    },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-200 flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-zinc-400" />
            <span>Multi-Provider Failover Mesh</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deterministic execution topology prioritizing Localhost:5002 with fallback to cloud providers.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 border border-white/5 bg-black/40 px-2 py-0.5 rounded self-start sm:self-auto">
          failover_budget: &lt;150ms
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
        {pipeline.map((item, idx) => (
          <div
            key={idx}
            className="rounded border border-white/10 bg-black/40 p-4 flex flex-col justify-between hover:border-white/20 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Node 0{item.step}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-zinc-300 bg-white/[0.02]">
                  {item.type}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${item.statusDot}`} />
                <span className="font-mono text-xs font-semibold text-zinc-100">{item.provider}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">Latency</span>
              <span className="text-zinc-200 font-medium">{item.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
