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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-zinc-400" />
            <span>Request Traces & Telemetry</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time observability stream logging latency, TTFT, token consumption, and auto-failovers.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 p-0.5 rounded border border-white/10 bg-black/40 text-xs font-mono self-start sm:self-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              filter === "all" ? "bg-white/10 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All ({traces.length})
          </button>
          <button
            onClick={() => setFilter("failover")}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              filter === "failover" ? "bg-white/10 text-amber-300 font-medium" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Failovers ({traces.filter((t) => t.failoverOccurred).length})
          </button>
          <button
            onClick={() => setFilter("cached")}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              filter === "cached" ? "bg-white/10 text-cyan-300 font-medium" : "text-zinc-500 hover:text-zinc-300"
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
