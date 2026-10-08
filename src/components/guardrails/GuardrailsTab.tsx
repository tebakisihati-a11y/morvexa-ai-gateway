"use client";

import React, { useState } from "react";
import { Shield, Lock, Database, Users, Globe, ExternalLink, CheckCircle } from "lucide-react";

export function GuardrailsTab() {
  const [maskPii, setMaskPii] = useState(true);
  const [promptCaching, setPromptCaching] = useState(true);
  const [budgetCap, setBudgetCap] = useState(50);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-400" />
          <span>Security Guardrails & 100% Free Deployment</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Enterprise compliance controls, budget protection, and zero-cost hosting setup guide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Compliance Guardrails */}
        <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-zinc-100 pb-3 border-b border-white/5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-400" />
            <span>Data Protection & Cost Optimizers</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-black/40">
              <div>
                <div className="text-xs font-medium text-zinc-200">PII Data Masking</div>
                <div className="text-[11px] text-zinc-400">
                  Automatically sanitizes emails, credit cards, and tokens before upstream delivery.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaskPii(!maskPii)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  maskPii ? "bg-orange-500 justify-end" : "bg-zinc-800 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-black/40">
              <div>
                <div className="text-xs font-medium text-zinc-200">Semantic Prompt Caching</div>
                <div className="text-[11px] text-zinc-400">
                  Cache identical user requests to return responses in &lt;15ms with 0 upstream cost.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromptCaching(!promptCaching)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  promptCaching ? "bg-orange-500 justify-end" : "bg-zinc-800 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="p-3 rounded-lg border border-white/5 bg-black/40 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-zinc-200">Monthly Team Budget Ceiling</span>
                <span className="font-mono text-orange-400 font-bold">${budgetCap} / mo</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 block">
                Stops requests immediately once organizational budget ceiling is reached.
              </span>
            </div>
          </div>
        </div>

        {/* Free Cloud Deployment Guide */}
        <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-zinc-100 pb-3 border-b border-white/5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" />
            <span>100% Free Hosting & Domain Guide</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>1. Hosting Gratis (Vercel Hobby Tier)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Push repository ini ke GitHub, lalu import di Vercel. Next.js 15 & Hono Edge Routes langsung live gratis selamanya dengan SSL otomatis.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>2. Database Gratis (Supabase Free Tier)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Buat project gratis di Supabase, jalankan SQL di <code className="text-orange-300">supabase/migrations/20261008_init.sql</code>, lalu masukkan environment variable.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>3. Domain Gratis (Vercel / is-a.dev)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Gunakan domain bawaan <code className="text-orange-300">*.vercel.app</code> atau daftarkan subdomain gratis untuk developer via <strong>is-a.dev</strong> (GitHub PR) diarahkan ke CNAME Vercel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
