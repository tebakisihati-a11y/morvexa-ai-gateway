"use client";

import React from "react";
import type { RequestTraceLog } from "@/lib/types";
import { GitBranch, Database, ExternalLink } from "lucide-react";

interface TracesTableProps {
  traces: RequestTraceLog[];
  onSelectTrace: (trace: RequestTraceLog) => void;
}

export function TracesTable({ traces, onSelectTrace }: TracesTableProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#121215] overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-mono uppercase text-zinc-500">
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Endpoint</th>
              <th className="py-2.5 px-4 font-semibold">Model</th>
              <th className="py-2.5 px-4 font-semibold">Provider</th>
              <th className="py-2.5 px-4 font-semibold">TTFT</th>
              <th className="py-2.5 px-4 font-semibold">Duration</th>
              <th className="py-2.5 px-4 font-semibold">Tokens</th>
              <th className="py-2.5 px-4 font-semibold text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-mono">
            {traces.map((trace) => (
              <tr
                key={trace.id}
                onClick={() => onSelectTrace(trace)}
                className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      trace.statusCode === 200
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {trace.statusCode}
                  </span>
                </td>

                <td className="py-3 px-4 text-zinc-300">
                  <span className="text-zinc-400">{trace.endpoint}</span>
                </td>

                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-200 font-medium">{trace.modelRequested}</span>
                    {trace.failoverOccurred && (
                      <span
                        className="p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        title="Failover Occurred"
                      >
                        <GitBranch className="h-3 w-3" />
                      </span>
                    )}
                    {trace.cached && (
                      <span
                        className="p-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        title="Prompt Cache Hit"
                      >
                        <Database className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-4 text-zinc-400 capitalize">
                  {trace.provider}
                </td>

                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {trace.ttftMs}ms
                </td>

                <td className="py-3 px-4 text-zinc-300">
                  {trace.totalDurationMs}ms
                </td>

                <td className="py-3 px-4 text-zinc-400">
                  {trace.promptTokens + trace.completionTokens}
                </td>

                <td className="py-3 px-4 text-right text-zinc-500 text-[11px] group-hover:text-zinc-300 transition-colors">
                  {new Date(trace.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
