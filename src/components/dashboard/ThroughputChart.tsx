"use client";

import React from "react";
import { BarChart2 } from "lucide-react";

interface ThroughputChartProps {
  hourlyRequestCounts: number[];
  scope: "instance";
}

export function ThroughputChart({ hourlyRequestCounts, scope }: ThroughputChartProps) {
  const maxVal = Math.max(1, ...hourlyRequestCounts);

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5] flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-[#a1a1aa]" />
            <span>Gateway traffic · 24 jam</span>
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Request gateway yang terukur pada instance berjalan
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#a1a1aa] self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
            <span className="text-[#f4f4f5]">puncak: {maxVal} req/jam</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Histogram */}
      <div className="h-28 flex items-end gap-1.5 pt-4 border-b border-white/5">
        {hourlyRequestCounts.map((val, idx) => {
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
                {val} req/jam
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
      <p className="mt-2 text-[10px] font-mono text-zinc-500">
        Data tidak mencakup instance Vercel lain dan dapat hilang saat instance dimulai ulang ({scope}).
      </p>
    </div>
  );
}
