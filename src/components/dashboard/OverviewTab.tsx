"use client";

import React, { useState } from "react";
import type { QuotaStatus, SystemMetrics } from "@/lib/types";
import { TelemetryMetrics } from "./TelemetryMetrics";
import { DualQuotaCard } from "./DualQuotaCard";
import { ThroughputChart } from "./ThroughputChart";
import { Terminal, Copy, Check, Sparkles, ShieldCheck } from "lucide-react";

interface OverviewTabProps {
  quota: QuotaStatus;
  metrics: SystemMetrics;
  onNavigateToTab: (tab: any) => void;
}

export function OverviewTab({ quota, metrics, onNavigateToTab }: OverviewTabProps) {
  const [copied, setCopied] = useState(false);

  const curlSnippet = `curl -X POST https://your-domain.vercel.app/api/v1/messages \\
  -H "Authorization: Bearer mvx_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "messages": [{"role": "user", "content": "Hello Morvexa AI"}]
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-gradient-to-r from-[#121215] to-[#18181c]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-zinc-100">Gateway Command Center</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Mesh Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Universal edge proxy serving Anthropic & OpenAI formats with auto-failover and dual quota tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab("playground")}
            className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open SSE Playground</span>
          </button>
          <button
            onClick={() => onNavigateToTab("keys")}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Manage Keys
          </button>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <TelemetryMetrics metrics={metrics} />

      {/* Core Dual Rolling Quota Gauge Card */}
      <DualQuotaCard quota={quota} />

      {/* Throughput Activity Chart */}
      <ThroughputChart />

      {/* Quick Developer Integration cURL Snippet */}
      <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Quick Proxy Integration (Anthropic Compatible)
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-white/10 bg-black/40 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy cURL</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg bg-black/60 border border-white/5 p-3.5 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
          <pre>{curlSnippet}</pre>
        </div>
      </div>
    </div>
  );
}
