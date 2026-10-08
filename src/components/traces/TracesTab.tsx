"use client";

import React, { useState } from "react";
import type { RequestTraceLog } from "@/lib/types";
import { TracesTable } from "./TracesTable";
import { TraceDetailDrawer } from "./TraceDetailDrawer";
import { Activity, Filter, RefreshCw } from "lucide-react";

interface TracesTabProps {
  traces: RequestTraceLog[];
}

export function TracesTab({ traces }: TracesTabProps) {
  const [selectedTrace, setSelectedTrace] = useState<RequestTraceLog | null>(null);
  const [filter, setFilter] = useState<"all" | "failover" | "cached">("all");

  const filteredTraces = traces.filter((t) => {
    if (filter === "failover") return t.failoverOccurred;
    if (filter === "cached") return t.cached;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <span>Live Request Traces & Telemetry</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time observability stream logging latency, TTFT, token consumption, and auto-failovers.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5 text-xs font-mono">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              filter === "all" ? "bg-white/10 text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Traces ({traces.length})
          </button>
          <button
            onClick={() => setFilter("failover")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              filter === "failover" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Failovers ({traces.filter((t) => t.failoverOccurred).length})
          </button>
          <button
            onClick={() => setFilter("cached")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              filter === "cached" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Cached ({traces.filter((t) => t.cached).length})
          </button>
        </div>
      </div>

      <TracesTable
        traces={filteredTraces}
        onSelectTrace={(t) => setSelectedTrace(t)}
      />

      <TraceDetailDrawer
        trace={selectedTrace}
        onClose={() => setSelectedTrace(null)}
      />
    </div>
  );
}
