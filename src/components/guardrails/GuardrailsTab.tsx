"use client";

import React, { useState, useEffect } from "react";
import { Shield, Lock, Database, Users, Globe, ExternalLink, CheckCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

export function GuardrailsTab() {
  const [maskPii, setMaskPii] = useState(true);
  const [promptCaching, setPromptCaching] = useState(true);
  const [budgetCap, setBudgetCap] = useState(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/owner/guardrails");
      const data = await res.json();
      if (res.ok) {
        setMaskPii(data.maskPii);
        setPromptCaching(data.promptCaching);
        setBudgetCap(data.monthlyBudgetCeiling);
      }
    } catch { /* keep defaults */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadConfig(); }, []);

  const saveToggle = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch("/api/owner/guardrails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maskPii, promptCaching, monthlyBudgetCeiling: budgetCap }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Gagal menyimpan konfigurasi guardrails.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[#f4f4f5] tracking-tight flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-[#a1a1aa]" />
          <span>Security Guardrails & Deployment Configuration</span>
        </h2>
        <p className="text-xs text-[#a1a1aa] mt-0.5">
          Enterprise compliance controls, budget protection, and zero-cost hosting setup guide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Compliance Guardrails */}
        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5] flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span>Data Protection & Cost Controls</span>
            </h3>
            <span className="text-[11px] font-mono text-[#71717a]">[layer: edge_waf]</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded border border-white/5 bg-black/40">
              <div className="pr-2">
                <div className="text-xs font-mono font-medium text-[#f4f4f5]">PII Data Sanitization</div>
                <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                  Masks credit cards, emails, and API keys before forwarding upstream.
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setMaskPii(!maskPii); void saveToggle(); }}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer shrink-0 ${
 maskPii
 ? "bg-white/5 border-white/10 text-[#10b981]"
 : "bg-white/[0.02] border-white/5 text-[#71717a]"
 }`}
              >
                {maskPii ? "enabled" : "disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded border border-white/5 bg-black/40">
              <div className="pr-2">
                <div className="text-xs font-mono font-medium text-[#f4f4f5]">Semantic Prompt Caching</div>
                <div className="text-[11px] text-[#a1a1aa] mt-0.5">
                  Short-circuits identical inferences at edge in &lt;15ms with 0 token cost.
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setPromptCaching(!promptCaching); void saveToggle(); }}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer shrink-0 ${
 promptCaching
 ? "bg-white/5 border-white/10 text-[#10b981]"
 : "bg-white/[0.02] border-white/5 text-[#71717a]"
 }`}
              >
                {promptCaching ? "enabled" : "disabled"}
              </button>
            </div>

            <div className="p-3 rounded border border-white/5 bg-black/40 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#f4f4f5]">Monthly Team Budget Ceiling</span>
                <span className="text-[#f4f4f5] font-bold">${budgetCap} / mo</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={budgetCap}
                onChange={(e) => { setBudgetCap(Number(e.target.value)); void saveToggle(); }}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#71717a] block">
                circuit_breaker: rejects requests when organizational threshold is exceeded.
              </span>
            </div>
          </div>

{saveError && (
  <p className="text-[11px] text-[#ef4444] font-mono mt-1">{saveError}</p>
)}
{saving && <p className="text-[10px] font-mono text-[#a1a1aa]">Menyimpan…</p>}
        </div>

        {/* Free Cloud Deployment Guide */}
        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5] flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span>100% Free Hosting & Domain Architecture</span>
            </h3>
            <span className="text-[11px] font-mono text-[#10b981]">[cost: $0.00/mo]</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#f4f4f5] font-semibold">[01] Hosting Gratis (Vercel Edge)</span>
                <span className="text-[#10b981] text-[10px]">active</span>
              </div>
              <p className="text-[#a1a1aa] text-[11px] leading-relaxed">
                Serverless Edge Workers dengan SSL otomatis gratis selamanya. Tanpa biaya server per jam.
              </p>
            </div>

            <div className="p-3 rounded bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#f4f4f5] font-semibold">[02] Database Gratis (Supabase Postgres)</span>
                <span className="text-[#10b981] text-[10px]">configured</span>
              </div>
              <p className="text-[#a1a1aa] text-[11px] leading-relaxed">
                Migration schema <code className="text-[#f4f4f5]">supabase/migrations/20261008_init.sql</code> menyediakan storage quota & audit logs permanen.
              </p>
            </div>

            <div className="p-3 rounded bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#f4f4f5] font-semibold">[03] Domain Gratis (Vercel / is-a.dev)</span>
                <span className="text-[#10b981] text-[10px]">ssl_ready</span>
              </div>
              <p className="text-[#a1a1aa] text-[11px] leading-relaxed">
                Domain live <code className="text-[#f4f4f5]">morvexa-ai-gateway.vercel.app</code> dapat dihubungkan ke custom subdomain gratis via is-a.dev CNAME.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
