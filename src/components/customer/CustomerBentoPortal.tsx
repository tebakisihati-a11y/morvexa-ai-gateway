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
import { PLAN_SPECS } from "@/lib/billing/catalog";
import { MODEL_PRODUCTS, type ModelProduct } from "@/lib/customer/catalog";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0B0D1A] via-[#06070F] to-[#11142A] border border-[#E9EDFB]/10 shadow-[0_0_50px_rgba(91, 141, 239,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B8DEF]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B8DEF]/10 border border-[#5B8DEF]/30 text-[#5B8DEF] text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PORTAL RESMI KUSTOMER MORVEXA</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#E9EDFB] leading-tight">
            Universal AI Gateway & Model Store. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B8DEF] to-[#E9EDFB]">
              Automated Keys & Token Dispatch ke Email Anda.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#8E97BC] leading-relaxed">
            Akses model AI unggulan seperti <strong className="text-[#5B8DEF]">DeepSeek V3 / R1</strong>, Claude 3.7 Sonnet, hingga GPT-4o dengan sistem tarif pasaran per-token terjangkau, atau pilih paket langganan bulanan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-5 py-3 rounded-xl font-semibold text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "models"
                ? "bg-[#5B8DEF] text-[#06070F] shadow-[0_0_20px_rgba(91, 141, 239,0.35)]"
                : "border border-[#E9EDFB]/15 bg-white/[0.02] text-[#8E97BC] hover:text-[#E9EDFB]"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Beli Token Model AI (DeepSeek dkk)</span>
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`px-5 py-3 rounded-xl font-semibold text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "plans"
                ? "bg-[#5B8DEF] text-[#06070F] shadow-[0_0_20px_rgba(91, 141, 239,0.35)]"
                : "border border-[#E9EDFB]/15 bg-white/[0.02] text-[#8E97BC] hover:text-[#E9EDFB]"
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
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 bg-[#0B0D1A] border border-[#E9EDFB]/10 hover:border-[#5B8DEF]/30 transition-all group flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#5B8DEF]/10 border border-[#5B8DEF]/30 flex items-center justify-center text-[#5B8DEF]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#E9EDFB] group-hover:text-[#5B8DEF] transition-colors">
                Instant Automatic Key Dispatch
              </h3>
              <p className="text-xs text-[#8E97BC] mt-1.5 leading-relaxed">
                Tanpa menunggu admin manual. Webhook pembayaran memicu penerbitan token CSPRNG aman yang otomatis dikirim ke kotak masuk email Anda lengkap dengan dokumentasi integrasi.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-[#06070F] border border-[#E9EDFB]/10 font-mono text-xs">
            <div className="flex items-center justify-between text-[#8E97BC] mb-2 text-[11px]">
              <span>SAMPLE DISPATCHED TOKEN</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#5B8DEF] hover:underline cursor-pointer"
              >
                {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="text-[#5B8DEF] truncate">{sampleKey}</div>
          </div>
        </div>

        {/* Bento 2: DeepSeek Ultra Low Latency */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0B0D1A] border border-[#E9EDFB]/10 hover:border-[#5B8DEF]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#2A3576]/40 border border-[#5B8DEF]/30 flex items-center justify-center text-[#5B8DEF]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E9EDFB]">DeepSeek Pasaran IDR</h3>
              <p className="text-xs text-[#8E97BC] mt-1.5">
                Mulai dari <strong className="text-[#5B8DEF]">IDR 100.000</strong> dapat hingga 20 Juta Token siap pakai.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-2xl font-extrabold text-[#5B8DEF]">Rp 100.000</div>
        </div>

        {/* Bento 3: Auto Failover */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#0B0D1A] border border-[#E9EDFB]/10 hover:border-[#5B8DEF]/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-[#2A3576]/40 border border-[#5B8DEF]/30 flex items-center justify-center text-[#5B8DEF]">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E9EDFB]">Auto-Failover Mesh</h3>
              <p className="text-xs text-[#8E97BC] mt-1.5">
                Jika provider overload (429), gateway otomatis mengalihkan permintaan ke model setara.
              </p>
            </div>
          </div>
          <div className="pt-4 font-mono text-xs text-[#8E97BC]">
            DeepSeek ➔ Anthropic ➔ Groq
          </div>
        </div>
      </div>

      {/* 3. Section Switcher: PRODUK MODEL AI (DeepSeek dkk) vs PAKET LANGGANAN */}
      <div className="flex items-center justify-between border-b border-[#E9EDFB]/10 pb-4">
        <div>
          <span className="text-xs font-mono text-[#5B8DEF] uppercase tracking-wider">
            {activeTab === "models" ? "KATALOG PRODUK MODEL AI KHUSUS (TOKEN BASED)" : "PAKET LANGGANAN BULANAN"}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#E9EDFB] mt-1">
            {activeTab === "models"
              ? "Beli Token Model AI — DeepSeek, Claude, GPT & Gemini"
              : "Paket Langganan Gateway All-in-One"}
          </h2>
          <p className="text-xs text-[#8E97BC] mt-1">
            {activeTab === "models"
              ? "Tarif pasaran resmi per token dan paket bundle siap pakai. Tanpa biaya bulanan tersembunyi."
              : "Langganan bulanan dengan batasan RPM dan rolling quota slot untuk operasional bisnis."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#06070F] border border-[#E9EDFB]/15 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("models")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === "models"
                ? "bg-[#5B8DEF] text-[#06070F] font-bold"
                : "text-[#8E97BC] hover:text-[#E9EDFB]"
            }`}
          >
            Produk Model AI
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === "plans"
                ? "bg-[#5B8DEF] text-[#06070F] font-bold"
                : "text-[#8E97BC] hover:text-[#E9EDFB]"
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
              className={`rounded-3xl p-6 border bg-[#0B0D1A] flex flex-col justify-between relative transition-all group hover:border-[#5B8DEF]/50 ${
                prod.id.includes("deepseek")
                  ? "border-[#5B8DEF]/40 shadow-[0_0_25px_rgba(91, 141, 239,0.1)]"
                  : "border-[#E9EDFB]/15"
              }`}
            >
              {prod.badge && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#5B8DEF] text-[#06070F] text-[10px] font-mono font-bold uppercase tracking-wider">
                  {prod.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#5B8DEF]/10 text-[#5B8DEF] border border-[#5B8DEF]/20 font-bold">
                    {prod.provider.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-[#8E97BC]">{prod.contextWindow}</span>
                </div>

                <h3 className="font-bold text-lg text-[#E9EDFB] mt-3 group-hover:text-[#5B8DEF] transition-colors">
                  {prod.name}
                </h3>
                <p className="text-xs text-[#8E97BC] mt-1 font-mono">{prod.tagline}</p>

                {/* Price Display */}
                <div className="mt-5 p-4 rounded-2xl bg-[#06070F] border border-[#E9EDFB]/10 space-y-2 font-mono">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#8E97BC]">Harga Paket Siap Pakai:</span>
                    <span className="text-xl font-extrabold text-[#5B8DEF]">
                      Rp {prod.bundlePriceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#E9EDFB]">
                    <span className="text-[#8E97BC]">Token Didapatkan:</span>
                    <span className="font-bold text-emerald-400">
                      {prod.bundleTokensGranted.toLocaleString("id-ID")} Tokens
                    </span>
                  </div>
                </div>

                {/* Market Price Breakdown per 1k tokens */}
                <div className="mt-4 space-y-1.5 text-[11px] font-mono text-[#8E97BC] border-t border-[#E9EDFB]/10 pt-3">
                  <div className="flex justify-between">
                    <span>Input Token Pasaran:</span>
                    <span className="text-[#E9EDFB]">Rp {prod.pricePer1kInputTokensIdr} / 1k</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output Token Pasaran:</span>
                    <span className="text-[#E9EDFB]">Rp {prod.pricePer1kOutputTokensIdr} / 1k</span>
                  </div>
                </div>

                <p className="text-xs text-[#8E97BC] mt-3 leading-relaxed">
                  {prod.description}
                </p>

                {/* Policy Compliance Note */}
                <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-mono text-zinc-400 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[#5B8DEF] shrink-0 mt-0.5" />
                  <span>{prod.compliancePolicy}</span>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <button
                  onClick={() => onOpenModelCheckoutModal(prod)}
                  className="w-full py-3 rounded-xl bg-[#5B8DEF] hover:bg-[#5B8DEF]/90 text-[#06070F] font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(91, 141, 239,0.25)] flex items-center justify-center gap-2 cursor-pointer"
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
              color: "border-[#E9EDFB]/15",
              btn: "Mulai Gratis",
            },
            {
              code: "pro",
              name: "Pro Workspace",
              price: "Rp 750.000",
              period: "/ bulan",
              spec: PLAN_SPECS.pro,
              color: "border-[#5B8DEF] bg-[#0B0D1A]/80 shadow-[0_0_30px_rgba(91, 141, 239,0.15)]",
              btn: "Beli Paket Pro",
              popular: true,
            },
            {
              code: "apex",
              name: "Apex Scale",
              price: "Rp 2.500.000",
              period: "/ bulan",
              spec: PLAN_SPECS.apex,
              color: "border-[#E9EDFB]/15",
              btn: "Beli Paket Apex",
            },
            {
              code: "zenith",
              name: "Zenith Enterprise",
              price: "Rp 10.000.000",
              period: "/ bulan",
              spec: PLAN_SPECS.zenith,
              color: "border-[#E9EDFB]/15",
              btn: "Beli Paket Enterprise",
            },
          ].map((plan) => (
            <div
              key={plan.code}
              className={`rounded-3xl p-6 sm:p-7 border bg-[#0B0D1A] flex flex-col justify-between relative ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#5B8DEF] text-[#06070F] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Paling Populer
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-[#E9EDFB]">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-[#E9EDFB]">{plan.price}</span>
                  <span className="text-xs font-mono text-[#8E97BC]">{plan.period}</span>
                </div>

                <div className="mt-6 space-y-3 border-t border-[#E9EDFB]/10 pt-4 font-mono text-xs">
                  <div className="text-[#8E97BC] text-[11px] uppercase tracking-wider font-semibold">
                    Kapasitas Gateway:
                  </div>
                  <div className="flex items-center gap-2 text-[#E9EDFB]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B8DEF] shrink-0" />
                    <span>Rate Limit: {plan.spec.rateLimitRpm} RPM</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#E9EDFB]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B8DEF] shrink-0" />
                    <span>{plan.spec.dailyTokens.toLocaleString()} Token / Hari</span>
                  </div>

                  <div className="text-[#8E97BC] text-[11px] uppercase tracking-wider font-semibold pt-2">
                    Model AI Terintegrasi:
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.spec.models.map((mod, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#5B8DEF]/10 text-[#5B8DEF] text-[10px] border border-[#5B8DEF]/20"
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
                    ? "bg-[#5B8DEF] text-[#06070F] hover:bg-[#5B8DEF]/90 shadow-[0_0_15px_rgba(91, 141, 239,0.3)]"
                    : "border border-[#E9EDFB]/20 text-[#E9EDFB] hover:bg-[#E9EDFB]/5"
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
