"use client";

import React from "react";
import { ArrowUpRight, BarChart2 } from "lucide-react";

export function ThroughputChart() {
  // 24 data points representing the last 24 hours
  const hourlyData = [
    32, 45, 60, 48, 28, 18, 12, 15, 42, 85, 110, 145, 160, 152, 175, 190, 180, 210, 195, 165,
    140, 115, 95, 78,
  ];

  const maxVal = Math.max(...hourlyData);

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-200 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-zinc-400" />
            <span>24-Hour Gateway Traffic Ingestion</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Throughput telemetry aggregated across edge workers
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span>peak: {maxVal} req/m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>success_rate: 99.8%</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Histogram */}
      <div className="h-28 flex items-end gap-1.5 pt-4 border-b border-white/5">
        {hourlyData.map((val, idx) => {
          const heightPercent = Math.round((val / maxVal) * 100);
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center group relative h-full justify-end"
            >
              <div
                className="w-full bg-white/10 hover:bg-orange-500/80 rounded-t-sm transition-all duration-200"
                style={{ height: `${heightPercent}%` }}
              />
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-200 px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                {val} req/m
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-2">
        <span>24h ago</span>
        <span>18h ago</span>
        <span>12h ago</span>
        <span>6h ago</span>
        <span className="text-orange-400 font-bold">Now</span>
      </div>
    </div>
  );
}
