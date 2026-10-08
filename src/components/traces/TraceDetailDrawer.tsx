"use client";

import React from "react";
import type { RequestTraceLog } from "@/lib/types";
import { X, Clock, Zap, GitBranch, Database, ShieldAlert, CheckCircle2 } from "lucide-react";

interface TraceDetailDrawerProps {
  trace: RequestTraceLog | null;
  onClose: () => void;
}

export function TraceDetailDrawer({ trace, onClose }: TraceDetailDrawerProps) {
  if (!trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#121215] border-l border-white/10 h-full p-6 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">Trace ID:</span>
              <span className="font-mono text-xs text-orange-400 font-bold">{trace.id}</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
              {new Date(trace.timestamp).toLocaleTimeString()} • {trace.endpoint}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Trace Payload details */}
        <div className="space-y-5 py-5 text-xs font-mono">
          {/* Status & Provider Banner */}
          <div className="p-3.5 rounded-lg bg-black/50 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  trace.statusCode === 200
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                HTTP {trace.statusCode}
              </span>
              <span className="text-zinc-300 font-sans font-medium">
                {trace.modelRequested}
              </span>
            </div>

            <span className="text-zinc-400 capitalize">{trace.provider}</span>
          </div>

          {/* Failover Event (if occurred) */}
          {trace.failoverOccurred && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold font-sans">
                <GitBranch className="h-3.5 w-3.5" />
                <span>Failover Hop Triggered</span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-sans leading-relaxed">
                {trace.failoverReason || "Primary upstream returned error. Traffic seamlessly switched to backup node."}
              </p>
            </div>
          )}

          {/* Latency & Tokens Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[11px]">Time to First Token (TTFT)</span>
              <div className="text-sm font-bold text-emerald-400">{trace.ttftMs} ms</div>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[11px]">Total Roundtrip Duration</span>
              <div className="text-sm font-bold text-zinc-200">{trace.totalDurationMs} ms</div>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[11px]">Input Tokens</span>
              <div className="text-sm font-bold text-zinc-300">{trace.promptTokens}</div>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[11px]">Output Tokens</span>
              <div className="text-sm font-bold text-zinc-300">{trace.completionTokens}</div>
            </div>
          </div>

          {/* Routing Spec */}
          <div className="p-3.5 rounded-lg bg-black/40 border border-white/5 space-y-2">
            <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
              Gateway Execution Parameters
            </span>
            <div className="space-y-1 text-[11px] text-zinc-400">
              <div className="flex justify-between">
                <span>Requested Model:</span>
                <span className="text-zinc-200">{trace.modelRequested}</span>
              </div>
              <div className="flex justify-between">
                <span>Routed Model:</span>
                <span className="text-zinc-200">{trace.modelRouted}</span>
              </div>
              <div className="flex justify-between">
                <span>Prompt Cache Hit:</span>
                <span className={trace.cached ? "text-cyan-400" : "text-zinc-500"}>
                  {trace.cached ? "YES (100% saved)" : "NO"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
