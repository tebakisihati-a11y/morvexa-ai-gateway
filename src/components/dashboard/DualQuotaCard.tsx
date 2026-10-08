"use client";

import React, { useEffect, useState } from "react";
import type { QuotaStatus } from "@/lib/types";
import { formatTimeRemaining } from "@/lib/quota";
import { Clock, ShieldAlert, Sparkles, RefreshCw, Zap } from "lucide-react";

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
    <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Dual Rolling Quota Engine
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Live Window
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            2-Tier rate-limiting architecture with 5-hour rolling TTL auto-recovery
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-black/40 border border-white/5 px-2.5 py-1 rounded-md">
          <Clock className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
          <span>Next Restore:</span>
          <strong className="text-zinc-200">
            {countdownMs ? formatTimeRemaining(countdownMs) : "Full Capacity"}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Scheme 1: Standard & Fast Models (5-Hour Rolling Request Cap) */}
        <div className="rounded-lg border border-white/5 bg-black/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Standard & Fast Models
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Request Cap
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Claude 3.5 Sonnet, Haiku, Gemini 2.0 Flash, DeepSeek V3. Setap request kedaluwarsa tepat 5 jam setelah dipanggil.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            {/* Circular Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-zinc-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-emerald-500 transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-base font-bold text-zinc-100">{requestPercent}%</span>
                <span className="text-[9px] text-zinc-500">5h used</span>
              </div>
            </div>

            {/* Quota details */}
            <div className="space-y-1.5 flex-1 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-[11px]">5 Jam Rolling:</span>
                <span className="text-zinc-200 font-bold">
                  {quota.standard5hUsed} / {quota.standard5hLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-[11px]">7 Hari Total:</span>
                <span className="text-zinc-300">
                  {quota.standard7dUsed} / {quota.standard7dLimit} req
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-zinc-500">Sisa Slot:</span>
                <span className="text-emerald-400 font-bold">
                  {quota.standard5hRemaining} requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scheme 2: Frontier & Latest Models (Weekly & Daily Token Cap) */}
        <div className="rounded-lg border border-white/5 bg-black/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Frontier Models
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Token Cap
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Claude 3.7 Sonnet, Opus 4.7, GPT-4o, o3-mini. Dibatasi oleh akumulasi token per minggu dan per hari.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Daily Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-zinc-500">Token per Hari (24h):</span>
                <span className="text-zinc-200 font-bold">
                  {(quota.latestDailyTokensUsed / 1000).toFixed(1)}k / {(quota.latestDailyTokensLimit / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestDailyPercentage}%` }}
                />
              </div>
            </div>

            {/* Weekly Token Bar */}
            <div>
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-zinc-500">Token per Minggu (7d):</span>
                <span className="text-zinc-200 font-bold">
                  {(quota.latestWeeklyTokensUsed / 1000000).toFixed(2)}M / {(quota.latestWeeklyTokensLimit / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${quota.latestWeeklyPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/5">
              <span className="text-zinc-500">Sisa Kuota Harian:</span>
              <span className="text-orange-400 font-bold">
                {(quota.latestDailyTokensRemaining / 1000).toFixed(1)}k tokens
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
