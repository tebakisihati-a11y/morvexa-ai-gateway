"use client";

import React, { useState } from "react";
import type { QuotaStatus, SystemMetrics } from "@/lib/types";
import { TelemetryMetrics } from "./TelemetryMetrics";
import { DualQuotaCard } from "./DualQuotaCard";
import { ThroughputChart } from "./ThroughputChart";
import { Terminal, Copy, Check, Play, KeyRound, Sparkles } from "lucide-react";

interface OverviewTabProps {
  quota: QuotaStatus;
  metrics: SystemMetrics;
  onNavigateToTab: (tab: any) => void;
}

export function OverviewTab({ quota, metrics, onNavigateToTab }: OverviewTabProps) {
  const [copied, setCopied] = useState(false);

  const curlSnippet = `curl -X POST https://morvexa-sistem.vercel.app/api/v1/messages \\
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
      {/* Overview Top Command Bar - High-density & Futuristic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-[#0A0C1E]/80 backdrop-blur-md">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-sm font-semibold tracking-tight text-[#E9EDFB]">
              Gateway Command Center
            </h1>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 border border-white/10 bg-black/40 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>edge-cluster: operational</span>
            </span>
            <span className="text-[11px] font-mono text-[#A5AFDD]/60 hidden md:inline">
              [rev: 2026.10]
            </span>
          </div>
          <p className="text-xs text-[#A5AFDD] mt-1.5 max-w-2xl leading-relaxed">
            Universal reverse proxy routing Anthropic and OpenAI protocols with multi-provider failover, PII sanitization, and rolling quota recovery.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToTab("playground")}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C0549F] via-[#9E3D7A] to-[#4A57B8] hover:opacity-95 text-white text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/20"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>Open Playground</span>
          </button>
          <button
            onClick={() => onNavigateToTab("keys")}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="h-3 w-3 text-[#A5AFDD]" />
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
      <div className="rounded-2xl border border-white/10 bg-[#0A0C1E]/80 backdrop-blur-md p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[#A5AFDD]" />
            <span className="text-xs font-mono font-medium text-zinc-200">
              Quick Proxy Integration · Anthropic Compatible
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-white/10 bg-black/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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

        <div className="rounded-xl bg-black/70 border border-white/5 p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
          <pre>{curlSnippet}</pre>
        </div>
      </div>
    </div>
  );
}

