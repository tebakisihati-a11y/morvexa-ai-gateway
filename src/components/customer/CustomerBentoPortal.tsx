"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  Cpu,
  CheckCircle2,
  Lock,
  Boxes,
  Copy,
  Check,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { PLAN_SPECS } from "@/lib/billing/provisioning";

interface CustomerPortalProps {
  onOpenCheckoutModal: (planCode: string) => void;
  onSwitchToOwnerDashboard: () => void;
}

export function CustomerBentoPortal({
  onOpenCheckoutModal,
  onSwitchToOwnerDashboard,
}: CustomerPortalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const sampleKey = "mvx_live_9f8a3c4b1e2d7e8f0a9b8c7d6e5f4a3b";

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      {/* 1. Header Hero with Bento Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0a0f0d] via-[#010302] to-[#111a15] border border-[#F0FEF8]/10 shadow-[0_0_50px_rgba(28,225,114,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1CE172]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1CE172]/10 border border-[#1CE172]/30 text-[#1CE172] text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CUSTOMER SELF-SERVICE PORTAL</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#F0FEF8] leading-tight">
            Seamless AI Gateway Access. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1CE172] to-[#F0FEF8]">
              Automated Keys Sent Directly to Your Email.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#889e93] leading-relaxed">
            Pilih paket langganan Anda. Begitu pembayaran terverifikasi, sistem secara otonom menerbitkan
            Morvexa API Key berkecepatan tinggi dan mengirimkannya langsung ke email Anda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <button
            onClick={() => onOpenCheckoutModal("pro")}
            className="px-5 py-3 rounded-xl bg-[#1CE172] text-[#010302] font-semibold text-xs font-mono hover:bg-[#1CE172]/90 shadow-[0_0_20px_rgba(28,225,114,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Beli Paket Langganan</span>
          </button>

          <button
            onClick={onSwitchToOwnerDashboard}
            className="px-4 py-3 rounded-xl border border-[#F0FEF8]/15 bg-white/[0.02] text-[#889e93] hover:text-[#F0FEF8] font-mono text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5 text-[#1CE172]" />
            <span>Masuk Owner Control Plane</span>
          </button>
        </div>
      </div>

      {/* 2. Bento Grid 3D-Animated Style (Inspired by Dribbble Reference) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Bento 1: Auto-Dispatch Email Guarantee (Wide Span) */}
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 bg-[#0a0f0d] border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-all group flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#1CE172]/10 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F0FEF8] group-hover:text-[#1CE172] transition-colors">
                Instant Automatic Key Dispatch
              </h3>
              <p className="text-xs text-[#889e93] mt-1.5 leading-relaxed">
                Tanpa menunggu verifikasi manual admin. Webhook pembayaran memicu penerbitan token CSPRNG aman yang langsung dikirimkan ke kotak masuk email Anda lengkap dengan petunjuk integrasi.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-[#010302] border border-[#F0FEF8]/10 font-mono text-xs">
            <div className="flex items-center justify-between text-[#889e93] mb-2 text-[11px]">
              <span>SAMPLE DISPATCHED TOKEN</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#1CE172] hover:underline cursor-pointer"
              >
                {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="text-[#1CE172] truncate">{sampleKey}</div>
          </div>
        </div>

        {/* Bento 2: Zero-Buffer SSE Streaming */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0a0f0d] border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#355C49]/40 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0FEF8]">Low Latency TTFT</h3>
              <p className="text-xs text-[#889e93] mt-1.5">
                Rata-rata 142ms Time-To-First-Token melalui edge router Hono.js.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-2xl font-extrabold text-[#1CE172]">142 ms</div>
        </div>

        {/* Bento 3: Multi-Provider Failover */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0a0f0d] border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#355C49]/40 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0FEF8]">Auto-Failover</h3>
              <p className="text-xs text-[#889e93] mt-1.5">
                Jika provider utama rate limit (429), gateway otomatis mengalihkan ke model setara.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-xs text-[#889e93]">
            Anthropic ➔ DeepSeek ➔ Groq
          </div>
        </div>
      </div>

      {/* 3. Paket Langganan Khusus Kustomer & Rincian Model AI yang Terintegrasi */}
      <div className="space-y-6">
        <div>
          <div className="text-xs font-mono text-[#1CE172] uppercase">PAKET LANGGANAN & INTEGRASI MODEL</div>
          <h2 className="text-2xl font-bold tracking-tight text-[#F0FEF8] mt-1">
            Pilih Paket Anda — Kunci Dibuat & Dikirimkan Otomatis
          </h2>
          <p className="text-xs text-[#889e93] mt-1">
            Setiap paket memiliki batasan kuota terverifikasi dan akses model AI yang terdokumentasi jelas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              code: "developer",
              name: "Developer Starter",
              price: "Rp 0",
              period: "/ bulan",
              spec: PLAN_SPECS.developer,
              color: "border-[#F0FEF8]/15",
              btn: "Mulai Gratis",
            },
            {
              code: "pro",
              name: "Pro Workspace",
              price: "Rp 750.000",
              period: "/ bulan",
              spec: PLAN_SPECS.pro,
              color: "border-[#1CE172] bg-[#0a0f0d]/80 shadow-[0_0_30px_rgba(28,225,114,0.15)]",
              btn: "Beli Paket Pro",
              popular: true,
            },
            {
              code: "apex",
              name: "Apex Scale",
              price: "Rp 2.500.000",
              period: "/ bulan",
              spec: PLAN_SPECS.apex,
              color: "border-[#F0FEF8]/15",
              btn: "Beli Paket Apex",
            },
            {
              code: "zenith",
              name: "Zenith Enterprise",
              price: "Rp 10.000.000",
              period: "/ bulan",
              spec: PLAN_SPECS.zenith,
              color: "border-[#F0FEF8]/15",
              btn: "Beli Paket Enterprise",
            },
          ].map((plan) => (
            <div
              key={plan.code}
              className={`rounded-3xl p-6 sm:p-7 border bg-[#0a0f0d] flex flex-col justify-between relative ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1CE172] text-[#010302] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Paling Populer
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-[#F0FEF8]">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-[#F0FEF8]">{plan.price}</span>
                  <span className="text-xs font-mono text-[#889e93]">{plan.period}</span>
                </div>

                <div className="mt-6 space-y-3 border-t border-[#F0FEF8]/10 pt-4 font-mono text-xs">
                  <div className="text-[#889e93] text-[11px] uppercase tracking-wider font-semibold">
                    Kapasitas Gateway:
                  </div>
                  <div className="flex items-center gap-2 text-[#F0FEF8]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1CE172] shrink-0" />
                    <span>Rate Limit: {plan.spec.rateLimitRpm} RPM</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#F0FEF8]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1CE172] shrink-0" />
                    <span>{plan.spec.dailyTokens.toLocaleString()} Token / Hari</span>
                  </div>

                  <div className="text-[#889e93] text-[11px] uppercase tracking-wider font-semibold pt-2">
                    Model AI Terintegrasi:
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.spec.models.map((mod, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#1CE172]/10 text-[#1CE172] text-[10px] border border-[#1CE172]/20"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenCheckoutModal(plan.code)}
                className={`w-full mt-8 py-3 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                  plan.popular
                    ? "bg-[#1CE172] text-[#010302] hover:bg-[#1CE172]/90 shadow-[0_0_15px_rgba(28,225,114,0.3)]"
                    : "border border-[#F0FEF8]/20 text-[#F0FEF8] hover:bg-[#F0FEF8]/5"
                }`}
              >
                {plan.btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
