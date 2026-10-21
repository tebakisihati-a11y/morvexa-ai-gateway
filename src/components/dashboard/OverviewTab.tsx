"use client";

import React, { useState } from "react";
import type { QuotaStatus, SystemMetrics } from "@/lib/types";
import { TelemetryMetrics } from "./TelemetryMetrics";
import { DualQuotaCard } from "./DualQuotaCard";
import { ThroughputChart } from "./ThroughputChart";
import { Terminal, Copy, Check, Play, KeyRound, Sparkles } from "lucide-react";
import Link from "next/link";

interface OverviewTabProps {
  quota: QuotaStatus;
  metrics: SystemMetrics;
  onNavigateToTab: (tab: any) => void;
  metricsError?: string | null;
}

export function OverviewTab({ quota, metrics, onNavigateToTab, metricsError }: OverviewTabProps) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-white/10 bg-[#0e0e11]/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-sm font-semibold tracking-tight text-[#f4f4f5]">
              Gateway Command Center
            </h1>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#a1a1aa] border border-white/10 bg-black/40 px-2.5 py-0.5 rounded-full">
              <span className={`h-1.5 w-1.5 rounded-full ${metricsError ? "bg-amber-400" : "bg-[#10b981]"}`} />
              <span>telemetry: {metricsError ? "unavailable" : "instance-local"}</span>
            </span>
            <span className="text-[11px] font-mono text-[#a1a1aa]/60 hidden md:inline">
              [rev: 2026.10]
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1.5 max-w-2xl leading-relaxed">
            Universal reverse proxy routing Anthropic and OpenAI protocols with multi-provider failover, PII sanitization, and rolling quota recovery.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToTab("playground")}
            className="px-3.5 py-2 rounded-lg bg-surface from-[#f97316] via-[#ea580c] to-[#c2410c] hover:opacity-95 text-white text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#f97316]/20"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>Open Playground</span>
          </button>
          <button
            onClick={() => onNavigateToTab("keys")}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#f4f4f5] text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="h-3 w-3 text-[#a1a1aa]" />
            <span>API Keys</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <TelemetryMetrics metrics={metrics} />
      {metricsError && (
        <p role="status" className="text-xs text-amber-300">
          Metrik live tidak dapat diperbarui: {metricsError}
        </p>
      )}

      {/* Core Dual Rolling Quota Gauge Card */}
      <DualQuotaCard quota={quota} />

      {/* Throughput Activity Chart */}
      <ThroughputChart
        hourlyRequestCounts={metrics.hourlyRequestCounts}
        scope={metrics.scope}
      />

      {/* Quick Developer Integration cURL Snippet */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span className="text-xs font-mono font-medium text-[#f4f4f5]">
              Quick Proxy Integration · Anthropic Compatible
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-[#a1a1aa] hover:text-[#f4f4f5] border border-white/10 bg-black/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-[#10b981]" />
                <span className="text-[#10b981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy cURL</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg bg-black/70 border border-white/5 p-4 font-mono text-xs text-[#f4f4f5] overflow-x-auto leading-relaxed">
          <pre>{curlSnippet}</pre>
        </div>
        <p className="mt-3 text-xs text-[#a1a1aa]">
          Buat gateway API key di tab <button onClick={() => onNavigateToTab("keys")} className="text-emerald-300 underline">API Keys</button>, lalu lihat panduan endpoint di{" "}
          <Link href="/docs" className="text-emerald-300 underline">dokumentasi Morvexa</Link>.
          Penggunaan provider AI dapat dikenai biaya oleh provider; cek kuota gratis dan harga provider Anda.
        </p>
      </div>
    </div>
  );
}
