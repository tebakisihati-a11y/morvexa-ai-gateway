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
    <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5] flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span>24-Hour Gateway Traffic Ingestion</span>
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Throughput telemetry aggregated across edge workers
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#a1a1aa] self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
            <span className="text-[#f4f4f5]">peak: {maxVal} req/m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[#10b981]">success_rate: 99.8%</span>
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
                className="w-full bg-[#c2410c]/40 hover:bg-surface hover:from-[#ea580c] hover:to-[#f97316] rounded-t-sm transition-all duration-200"
                style={{ height: `${heightPercent}%` }}
              />
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#16161b] border border-[#f97316]/40 text-[10px] font-mono text-[#f4f4f5] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                {val} req/m
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-[#71717a] mt-2">
        <span>24h ago</span>
        <span>18h ago</span>
        <span>12h ago</span>
        <span>6h ago</span>
        <span className="text-[#f97316] font-bold">Now</span>
      </div>
    </div>
  );
}

