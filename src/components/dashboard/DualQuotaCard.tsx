"use client";

import React, { useEffect, useState } from "react";
import type { QuotaStatus } from "@/lib/types";
import { formatTimeRemaining } from "@/lib/quota";
import { Clock } from "lucide-react";

interface DualQuotaCardProps {
  quota: QuotaStatus;
}

export function DualQuotaCard({ quota }: DualQuotaCardProps) {
  // Live ticking countdown for next slot restoration
  const [countdownMs, setCountdownMs] = useState<number | null>(quota.nextSlotRestoreMs);

  useEffect(() => {
    setCountdownMs(quota.nextSlotRestoreMs);
  }, [quota.nextSlotRestoreMs]);

  useEffect(() => {
    if (countdownMs === null || countdownMs <= 0) return;

    const interval = setInterval(() => {
      setCountdownMs((prev) => (prev !== null && prev > 1000 ? prev - 1000 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownMs]);

  const requestPercent = quota.standard5hPercentage;
  const strokeDashoffset = 283 - (283 * requestPercent) / 100;

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5]">
              Dual Rolling Quota Architecture
            </h2>
            <span className="text-[11px] font-mono text-[#a1a1aa]/60 hidden sm:inline">
              [window: 5h_ttl_sliding · 7d_cap]
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
            Two-tier rate-limiting engine with 5-hour rolling TTL auto-recovery and weekly token ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#a1a1aa] bg-black/60 border border-white/10 px-3 py-1.5 rounded-lg">
          <Clock className="h-3.5 w-3.5 text-[#f97316]" />
          <span>Next Slot Recovery:</span>
          <span className="text-[#f4f4f5] font-bold">
            {countdownMs ? formatTimeRemaining(countdownMs) : "100% Available"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Tier 1: Standard & Fast Models */}
        <div className="rounded-lg border border-white/10 bg-black/50 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">
                  Standard Tier Models
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#a1a1aa]">
                [100 req / 5h]
              </span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]/80 mb-4 leading-relaxed">
              Claude 3.5 Sonnet, Haiku, Gemini 2.0 Flash, DeepSeek V3. Each request slot recovers precisely 300 minutes post-dispatch.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
            {/* Circular Gauge */}
            <div className="relative w-20 h-20 shrink-0 mx-auto sm:mx-0 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-[#71717a]"
                  strokeWidth="7"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-[#f97316] transition-all duration-700 ease-out"
                  strokeWidth="7"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-sm font-bold text-[#f4f4f5]">{requestPercent}%</span>
                <span className="text-[9px] text-[#a1a1aa]/70">utilized</span>
              </div>
            </div>

            {/* Quota details */}
            <div className="space-y-1.5 flex-1 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa] text-[11px]">5h Sliding Window:</span>
                <span className="text-[#f4f4f5] font-medium">
                  {quota.standard5hUsed} / {quota.standard5hLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa] text-[11px]">7d Cumulative Cap:</span>
                <span className="text-[#f4f4f5]">
                  {quota.standard7dUsed} / {quota.standard7dLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-[#a1a1aa]">Remaining Slots:</span>
                <span className="text-[#10b981] font-semibold">
                  {quota.standard5hRemaining} requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Frontier Models */}
        <div className="rounded-lg border border-white/10 bg-black/50 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#f97316]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">
                  Frontier & Reasoning Models
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#a1a1aa]">
                [token_budget: 24h/7d]
              </span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]/80 mb-4 leading-relaxed">
              Claude 3.7 Sonnet, GPT-4o, and reasoning architectures. Token ingestion bounded by daily velocity and weekly budgets.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs pt-1">
            {/* Daily Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-[#a1a1aa]">Daily Allocation (24h):</span>
                <span className="text-[#f4f4f5] font-medium">
                  {(quota.latestDailyTokensUsed / 1000).toFixed(1)}k / {(quota.latestDailyTokensLimit / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#71717a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-surface from-[#c2410c] to-[#f97316] rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestDailyPercentage}%` }}
                />
              </div>
            </div>

            {/* Weekly Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-[#a1a1aa]">Weekly Ceiling (7d):</span>
                <span className="text-[#f4f4f5] font-medium">
                  {(quota.latestWeeklyTokensUsed / 1000000).toFixed(2)}M / {(quota.latestWeeklyTokensLimit / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#71717a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-surface from-[#ea580c] to-[#f97316] rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestWeeklyPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/5">
              <span className="text-[#a1a1aa]">Daily Headroom:</span>
              <span className="text-[#f4f4f5] font-semibold">
                {(quota.latestDailyTokensRemaining / 1000).toFixed(1)}k tokens
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

