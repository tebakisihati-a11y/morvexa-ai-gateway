"use client";

import React, { useState } from "react";
import type { QuotaStatus, SystemMetrics } from "@/lib/types";
import { TelemetryMetrics } from "./TelemetryMetrics";
import { DualQuotaCard } from "./DualQuotaCard";
import { ThroughputChart } from "./ThroughputChart";
import { Terminal, Copy, Check, Play, KeyRound } from "lucide-react";

interface OverviewTabProps {
  quota: QuotaStatus;
  metrics: SystemMetrics;
  onNavigateToTab: (tab: any) => void;
}

export function OverviewTab({ quota, metrics, onNavigateToTab }: OverviewTabProps) {
  const [copied, setCopied] = useState(false);

  const curlSnippet = `curl -X POST https://morvexa-ai-gateway.vercel.app/api/v1/messages \\
  -H "Authorization: Bearer mvx_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "messages": [{"role": "user", "content": "Ping Morvexa Gateway"}]
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Command Bar - Realistic & High-density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-white/10 bg-[#0e0e11]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              Gateway Command Center
            </h1>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 border border-white/5 bg-black/40 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>edge-cluster: healthy</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
              [rev: 2026.10]
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Universal reverse proxy routing Anthropic and OpenAI protocols with multi-provider failover, PII sanitization, and rolling quota recovery.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToTab("playground")}
            className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>Open Playground</span>
          </button>
          <button
            onClick={() => onNavigateToTab("keys")}
            className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="h-3 w-3 text-zinc-400" />
            <span>API Keys</span>
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
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-mono font-medium text-zinc-200">
              Quick Proxy Integration · Anthropic Compatible
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-white/10 bg-black/40 px-2.5 py-1 rounded transition-colors cursor-pointer"
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

        <div className="rounded bg-black/70 border border-white/5 p-3.5 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
          <pre>{curlSnippet}</pre>
        </div>
      </div>
    </div>
  );
}
