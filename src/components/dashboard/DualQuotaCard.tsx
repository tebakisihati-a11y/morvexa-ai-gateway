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
    <div className="rounded-2xl border border-white/10 bg-[#0A0C1E]/80 backdrop-blur-md p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#E9EDFB]">
              Dual Rolling Quota Architecture
            </h2>
            <span className="text-[11px] font-mono text-[#A5AFDD]/60 hidden sm:inline">
              [window: 5h_ttl_sliding · 7d_cap]
            </span>
          </div>
          <p className="text-xs text-[#A5AFDD] mt-1 leading-relaxed">
            Two-tier rate-limiting engine with 5-hour rolling TTL auto-recovery and weekly token ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#A5AFDD] bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl">
          <Clock className="h-3.5 w-3.5 text-[#C0549F]" />
          <span>Next Slot Recovery:</span>
          <span className="text-[#E9EDFB] font-bold">
            {countdownMs ? formatTimeRemaining(countdownMs) : "100% Available"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Tier 1: Standard & Fast Models */}
        <div className="rounded-xl border border-white/10 bg-black/50 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-[#E9EDFB]">
                  Standard Tier Models
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#A5AFDD]">
                [100 req / 5h]
              </span>
            </div>
            <p className="text-[11px] text-[#A5AFDD]/80 mb-4 leading-relaxed">
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
                  className="text-zinc-900"
                  strokeWidth="7"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-[#C0549F] transition-all duration-700 ease-out"
                  strokeWidth="7"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-sm font-bold text-[#E9EDFB]">{requestPercent}%</span>
                <span className="text-[9px] text-[#A5AFDD]/70">utilized</span>
              </div>
            </div>

            {/* Quota details */}
            <div className="space-y-1.5 flex-1 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-[11px]">5h Sliding Window:</span>
                <span className="text-zinc-200 font-medium">
                  {quota.standard5hUsed} / {quota.standard5hLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-[11px]">7d Cumulative Cap:</span>
                <span className="text-zinc-300">
                  {quota.standard7dUsed} / {quota.standard7dLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-[#A5AFDD]">Remaining Slots:</span>
                <span className="text-emerald-400 font-semibold">
                  {quota.standard5hRemaining} requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Frontier Models */}
        <div className="rounded-xl border border-white/10 bg-black/50 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#C0549F]" />
                <span className="text-xs font-semibold text-[#E9EDFB]">
                  Frontier & Reasoning Models
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#A5AFDD]">
                [token_budget: 24h/7d]
              </span>
            </div>
            <p className="text-[11px] text-[#A5AFDD]/80 mb-4 leading-relaxed">
              Claude 3.7 Sonnet, GPT-4o, and reasoning architectures. Token ingestion bounded by daily velocity and weekly budgets.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs pt-1">
            {/* Daily Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-zinc-400">Daily Allocation (24h):</span>
                <span className="text-zinc-200 font-medium">
                  {(quota.latestDailyTokensUsed / 1000).toFixed(1)}k / {(quota.latestDailyTokensLimit / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4A57B8] to-[#C0549F] rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestDailyPercentage}%` }}
                />
              </div>
            </div>

            {/* Weekly Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-zinc-400">Weekly Ceiling (7d):</span>
                <span className="text-zinc-200 font-medium">
                  {(quota.latestWeeklyTokensUsed / 1000000).toFixed(2)}M / {(quota.latestWeeklyTokensLimit / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#9E3D7A] to-[#C0549F] rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestWeeklyPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/5">
              <span className="text-[#A5AFDD]">Daily Headroom:</span>
              <span className="text-[#E9EDFB] font-semibold">
                {(quota.latestDailyTokensRemaining / 1000).toFixed(1)}k tokens
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

