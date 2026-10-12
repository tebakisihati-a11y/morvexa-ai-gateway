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
  Boxes,
  Copy,
  Check,
  KeyRound,
  ExternalLink,
  Coins,
  DollarSign,
  TrendingUp,
  FileCode,
  Info,
} from "lucide-react";
import { PLAN_SPECS } from "@/lib/billing/provisioning";
import { MODEL_PRODUCTS, type ModelProduct } from "@/lib/customer/store";

interface CustomerBentoPortalProps {
  onOpenCheckoutModal: (planCode: string) => void;
  onOpenModelCheckoutModal: (model: ModelProduct) => void;
  activeCustomer: any;
  onOpenAuthModal: () => void;
}

export function CustomerBentoPortal({
  onOpenCheckoutModal,
  onOpenModelCheckoutModal,
  activeCustomer,
  onOpenAuthModal,
}: CustomerBentoPortalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"models" | "plans">("models");

  const sampleKey = "mvx_live_9f8a3c4b1e2d7e8f0a9b8c7d6e5f4a3b";

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      {/* 1. Header Hero with Bento Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0a0f0d] via-[#010302] to-[#111a15] border border-[#F0FEF8]/10 shadow-[0_0_50px_rgba(28,225,114,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1CE172]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1CE172]/10 border border-[#1CE172]/30 text-[#1CE172] text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PORTAL RESMI KUSTOMER MORVEXA</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#F0FEF8] leading-tight">
            Universal AI Gateway & Model Store. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1CE172] to-[#F0FEF8]">
              Automated Keys & Token Dispatch ke Email Anda.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#889e93] leading-relaxed">
            Akses model AI unggulan seperti <strong className="text-[#1CE172]">DeepSeek V3 / R1</strong>, Claude 3.7 Sonnet, hingga GPT-4o dengan sistem tarif pasaran per-token terjangkau, atau pilih paket langganan bulanan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-5 py-3 rounded-xl font-semibold text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "models"
                ? "bg-[#1CE172] text-[#010302] shadow-[0_0_20px_rgba(28,225,114,0.35)]"
                : "border border-[#F0FEF8]/15 bg-white/[0.02] text-[#889e93] hover:text-[#F0FEF8]"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Beli Token Model AI (DeepSeek dkk)</span>
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`px-5 py-3 rounded-xl font-semibold text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "plans"
                ? "bg-[#1CE172] text-[#010302] shadow-[0_0_20px_rgba(28,225,114,0.35)]"
                : "border border-[#F0FEF8]/15 bg-white/[0.02] text-[#889e93] hover:text-[#F0FEF8]"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Lihat Paket Langganan</span>
          </button>
        </div>
      </div>

      {/* 2. Bento Grid Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Bento 1: Instant Automatic Dispatch */}
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
                Tanpa menunggu admin manual. Webhook pembayaran memicu penerbitan token CSPRNG aman yang otomatis dikirim ke kotak masuk email Anda lengkap dengan dokumentasi integrasi.
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

        {/* Bento 2: DeepSeek Ultra Low Latency */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0a0f0d] border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#355C49]/40 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0FEF8]">DeepSeek Pasaran IDR</h3>
              <p className="text-xs text-[#889e93] mt-1.5">
                Mulai dari <strong className="text-[#1CE172]">IDR 100.000</strong> dapat hingga 20 Juta Token siap pakai.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-2xl font-extrabold text-[#1CE172]">Rp 100.000</div>
        </div>

        {/* Bento 3: Auto Failover */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0a0f0d] border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#355C49]/40 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F0FEF8]">Auto-Failover Mesh</h3>
              <p className="text-xs text-[#889e93] mt-1.5">
                Jika provider overload (429), gateway otomatis mengalihkan permintaan ke model setara.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-xs text-[#889e93]">
            DeepSeek ➔ Anthropic ➔ Groq
          </div>
        </div>
      </div>

      {/* 3. Section Switcher: PRODUK MODEL AI (DeepSeek dkk) vs PAKET LANGGANAN */}
      <div className="flex items-center justify-between border-b border-[#F0FEF8]/10 pb-4">
        <div>
          <span className="text-xs font-mono text-[#1CE172] uppercase tracking-wider">
            {activeTab === "models" ? "KATALOG PRODUK MODEL AI KHUSUS (TOKEN BASED)" : "PAKET LANGGANAN BULANAN"}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F0FEF8] mt-1">
            {activeTab === "models"
              ? "Beli Token Model AI — DeepSeek, Claude, GPT & Gemini"
              : "Paket Langganan Gateway All-in-One"}
          </h2>
          <p className="text-xs text-[#889e93] mt-1">
            {activeTab === "models"
              ? "Tarif pasaran resmi per token dan paket bundle siap pakai. Tanpa biaya bulanan tersembunyi."
              : "Langganan bulanan dengan batasan RPM dan rolling quota slot untuk operasional bisnis."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#010302] border border-[#F0FEF8]/15 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === "models"
                ? "bg-[#1CE172] text-[#010302] font-bold"
                : "text-[#889e93] hover:text-[#F0FEF8]"
            }`}
          >
            Produk Model AI
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === "plans"
                ? "bg-[#1CE172] text-[#010302] font-bold"
                : "text-[#889e93] hover:text-[#F0FEF8]"
            }`}
          >
            Paket Langganan
          </button>
        </div>
      </div>

      {/* 4A. TAB 1: MODEL PRODUCTS (DEEPSEEK, CLAUDE, GPT, GEMINI) */}
      {activeTab === "models" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {MODEL_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className={`rounded-3xl p-6 border bg-[#0a0f0d] flex flex-col justify-between relative transition-all group hover:border-[#1CE172]/50 ${
                prod.id.includes("deepseek")
                  ? "border-[#1CE172]/40 shadow-[0_0_25px_rgba(28,225,114,0.1)]"
                  : "border-[#F0FEF8]/15"
              }`}
            >
              {prod.badge && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#1CE172] text-[#010302] text-[10px] font-mono font-bold uppercase tracking-wider">
                  {prod.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#1CE172]/10 text-[#1CE172] border border-[#1CE172]/20 font-bold">
                    {prod.provider.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-[#889e93]">{prod.contextWindow}</span>
                </div>

                <h3 className="font-bold text-lg text-[#F0FEF8] mt-3 group-hover:text-[#1CE172] transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-[#889e93] mt-1 font-mono">{prod.tagline}</p>

                {/* Price Display */}
                <div className="mt-5 p-4 rounded-2xl bg-[#010302] border border-[#F0FEF8]/10 space-y-2 font-mono">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#889e93]">Harga Paket Siap Pakai:</span>
                    <span className="text-xl font-extrabold text-[#1CE172]">
                      Rp {prod.bundlePriceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#F0FEF8]">
                    <span className="text-[#889e93]">Token Didapatkan:</span>
                    <span className="font-bold text-emerald-400">
                      {prod.bundleTokensGranted.toLocaleString("id-ID")} Tokens
                    </span>
                  </div>
                </div>

                {/* Market Price Breakdown per 1k tokens */}
                <div className="mt-4 space-y-1.5 text-[11px] font-mono text-[#889e93] border-t border-[#F0FEF8]/10 pt-3">
                  <div className="flex justify-between">
                    <span>Input Token Pasaran:</span>
                    <span className="text-[#F0FEF8]">Rp {prod.pricePer1kInputTokensIdr} / 1k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output Token Pasaran:</span>
                    <span className="text-[#F0FEF8]">Rp {prod.pricePer1kOutputTokensIdr} / 1k</span>
                  </div>
                </div>

                <p className="text-xs text-[#889e93] mt-3 leading-relaxed">
                  {prod.description}
                </p>

                {/* Policy Compliance Note */}
                <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-mono text-zinc-400 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[#1CE172] shrink-0 mt-0.5" />
                  <span>{prod.compliancePolicy}</span>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <button
                  onClick={() => onOpenModelCheckoutModal(prod)}
                  className="w-full py-3 rounded-xl bg-[#1CE172] hover:bg-[#1CE172]/90 text-[#010302] font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(28,225,114,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="h-4 w-4" />
                  <span>Beli Token Rp {prod.bundlePriceIdr.toLocaleString("id-ID")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4B. TAB 2: PAKET LANGGANAN BULANAN */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-200">
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
      )}
    </div>
  );
}
