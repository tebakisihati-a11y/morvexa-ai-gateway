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
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-mono uppercase text-[#71717a]">
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
                className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                <td className="py-2.5 px-4">
                  {trace.statusCode === 200 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#10b981]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                      200 OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#ef4444]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                      {trace.statusCode} ERR
                    </span>
                  )}
                </td>

                <td className="py-2.5 px-4 text-[#f4f4f5]">
                  <span className="text-[#a1a1aa]">{trace.endpoint}</span>
                </td>

                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#f4f4f5]">{trace.modelRequested}</span>
                    {trace.failoverOccurred && (
                      <span
                        className="text-[10px] font-mono text-[#eab308] bg-[#eab308]/10 px-1 py-0.5 rounded border border-[#eab308]/20"
                        title="Failover Occurred"
                      >
                        [failover]
                      </span>
                    )}
                    {trace.cached && (
                      <span
                        className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1 py-0.5 rounded border border-cyan-400/20"
                        title="Prompt Cache Hit"
                      >
                        [cached]
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-2.5 px-4 text-[#a1a1aa]">
                  {trace.provider}
                </td>

                <td className="py-2.5 px-4 text-[#10b981] font-medium">
                  {trace.ttftMs}ms
                </td>

                <td className="py-2.5 px-4 text-[#f4f4f5]">
                  {trace.totalDurationMs}ms
                </td>

                <td className="py-2.5 px-4 text-[#a1a1aa]">
                  {trace.promptTokens + trace.completionTokens}
                </td>

                <td className="py-2.5 px-4 text-right text-[#71717a] text-[11px] group-hover:text-[#f4f4f5] transition-colors">
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
