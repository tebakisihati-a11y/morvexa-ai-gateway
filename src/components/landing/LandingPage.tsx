"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Server,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Lock,
  Globe,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import { Cinematic3DScene } from "./Cinematic3DScene";
import type { NavTabId } from "../layout/Sidebar";

interface LandingPageProps {
  onEnterDashboard: (targetTab?: NavTabId) => void;
}

export function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlSnippet = `curl https://morvexa-sistem.vercel.app/api/v1/messages \\
  -H "Authorization: Bearer mvx_live_a1b2c3d4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "messages": [{"role": "user", "content": "Unified AI routing initiated."}],
    "stream": true
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#010302] text-[#F0FEF8] selection:bg-[#1CE172]/20 selection:text-[#1CE172] font-sans">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#F0FEF8]/10 bg-[#010302]/90 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#355C49] border border-[#1CE172]/40 flex items-center justify-center font-mono font-bold text-sm text-[#1CE172] shadow-[0_0_15px_rgba(28,225,114,0.25)]">
            M
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-base text-[#F0FEF8]">
              Morvexa
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1CE172]/10 text-[#1CE172] border border-[#1CE172]/30">
              AI SERVER MASTER
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-[#889e93]">
          <a href="#models" className="hover:text-[#F0FEF8] transition-colors">
            Model Registry
          </a>
          <a href="#architecture" className="hover:text-[#F0FEF8] transition-colors">
            Architecture
          </a>
          <a href="#security" className="hover:text-[#F0FEF8] transition-colors">
            Zero-Leak Security
          </a>
          <a href="#pricing" className="hover:text-[#F0FEF8] transition-colors">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onEnterDashboard("overview")}
            className="text-xs font-mono px-3.5 py-1.5 rounded-lg border border-[#F0FEF8]/15 text-[#F0FEF8] hover:bg-[#F0FEF8]/5 transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <button
            onClick={() => onEnterDashboard("playground")}
            className="text-xs font-mono font-semibold px-4 py-1.5 rounded-lg bg-[#1CE172] text-[#010302] hover:bg-[#1CE172]/90 transition-all shadow-[0_0_20px_rgba(28,225,114,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <span>Get API Access</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Cinematic Hero Section with 3D Core */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center px-4 sm:px-8 max-w-7xl mx-auto pt-8 pb-16 overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#355C49]/20 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#1CE172]/15 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1CE172]/30 bg-[#1CE172]/5 text-[#1CE172] text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-[#1CE172] animate-pulse" />
              <span>UNIVERSAL GATEWAY & CONTROL PLANE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-[#F0FEF8] leading-[1.12]">
              ONE GATEWAY. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1CE172] via-[#F0FEF8] to-[#889e93]">
                MANY AI MODELS.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#889e93] max-w-xl font-normal leading-relaxed">
              Unify Anthropic, OpenAI, DeepSeek, and Gemini under a single authenticated
              Morvexa API Key. Real-time failover, zero-buffer streaming, and precision usage quotas.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onEnterDashboard("keys")}
                className="px-6 py-3 rounded-xl bg-[#1CE172] text-[#010302] font-semibold text-sm hover:bg-[#1CE172]/90 transition-all shadow-[0_0_25px_rgba(28,225,114,0.35)] flex items-center gap-2 cursor-pointer"
              >
                <span>Create Morvexa Key</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onEnterDashboard("playground")}
                className="px-6 py-3 rounded-xl border border-[#F0FEF8]/15 bg-[#0a0f0d]/80 text-[#F0FEF8] hover:bg-[#F0FEF8]/5 font-mono text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Terminal className="h-4 w-4 text-[#1CE172]" />
                <span>Open Playground</span>
              </button>
            </div>

            {/* Live Metrics Pill */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#F0FEF8]/10 max-w-lg font-mono">
              <div>
                <div className="text-xs text-[#889e93]">LATENCY TTFT</div>
                <div className="text-xl font-bold text-[#1CE172]">142ms</div>
              </div>
              <div>
                <div className="text-xs text-[#889e93]">UPSTREAM MESH</div>
                <div className="text-xl font-bold text-[#F0FEF8]">6 Active</div>
              </div>
              <div>
                <div className="text-xs text-[#889e93]">ISOLATION</div>
                <div className="text-xl font-bold text-[#F0FEF8]">Tenant RLS</div>
              </div>
            </div>
          </div>

          {/* Right 3D Geodesic Visualizer */}
          <div className="lg:col-span-5 h-[420px] sm:h-[480px] w-full rounded-2xl border border-[#F0FEF8]/10 bg-[#0a0f0d]/60 backdrop-blur-xl relative overflow-hidden shadow-[0_0_50px_rgba(53,92,73,0.25)] flex items-center justify-center">
            <Cinematic3DScene className="w-full h-full" />
            
            {/* Overlay status tag */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded bg-[#010302]/80 border border-[#1CE172]/30 text-[11px] font-mono text-[#1CE172]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1CE172] animate-ping" />
              <span>RADAR ONLINE</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center text-[11px] font-mono text-[#889e93] bg-[#010302]/70 px-3 py-1.5 rounded border border-[#F0FEF8]/5">
              <span>Interactive Geodesic Core</span>
              <span className="text-[#1CE172]">Zero-Buffer SSE</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Developer Quickstart Code Section */}
      <section className="py-16 border-y border-[#F0FEF8]/10 bg-[#0a0f0d]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-xs font-mono text-[#1CE172] mb-1">DEVELOPER INGRESS</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">One Endpoint. Unified SDK.</h2>
            </div>
            <div className="text-xs font-mono text-[#889e93]">
              Standard Bearer Token Auth | Constant-time SHA-256
            </div>
          </div>

          <div className="rounded-xl border border-[#F0FEF8]/15 bg-[#010302] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0f0d] border-b border-[#F0FEF8]/10">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-mono text-[#889e93] ml-2">curl-messages.sh</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs font-mono text-[#889e93] hover:text-[#1CE172] transition-colors cursor-pointer"
              >
                {copiedCurl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#1CE172]" />
                    <span className="text-[#1CE172]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Request</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 sm:p-6 text-xs sm:text-sm font-mono text-[#1CE172] overflow-x-auto leading-relaxed">
              <code>{curlSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* 4. Model Registry & Capabilities */}
      <section id="models" className="py-20 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-mono text-[#1CE172] mb-2 uppercase">Verified Models</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ecosystem Compatibility</h2>
          <p className="text-[#889e93] text-sm mt-3">
            Switch providers instantly without altering client client-side schemas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: "claude-3-7-sonnet",
              provider: "Anthropic",
              name: "Claude 3.7 Sonnet",
              desc: "Hybrid reasoning architecture with adaptive thinking depth.",
              context: "200k tokens",
              status: "Optimal",
            },
            {
              id: "deepseek-chat",
              provider: "DeepSeek",
              name: "DeepSeek V3",
              desc: "Ultra-efficient reasoning engine with minimal token overhead.",
              context: "64k tokens",
              status: "Optimal",
            },
            {
              id: "gpt-4o",
              provider: "OpenAI",
              name: "GPT-4o (Omni)",
              desc: "Multimodal high-throughput standard for agentic tasks.",
              context: "128k tokens",
              status: "Optimal",
            },
            {
              id: "gemini-2.0-flash",
              provider: "Google",
              name: "Gemini 2.0 Flash",
              desc: "High-concurrency streaming with ultra-large context.",
              context: "1.0M tokens",
              status: "Optimal",
            },
          ].map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-[#F0FEF8]/10 bg-[#0a0f0d] p-6 hover:border-[#1CE172]/40 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-3">
                  <span className="text-[#889e93]">{m.provider}</span>
                  <span className="text-[#1CE172] bg-[#1CE172]/10 px-2 py-0.5 rounded text-[10px] border border-[#1CE172]/30">
                    {m.status}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#F0FEF8] group-hover:text-[#1CE172] transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-[#889e93] mt-2 leading-relaxed">
                  {m.desc}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-[#F0FEF8]/5 flex items-center justify-between text-xs font-mono text-[#889e93]">
                <span>Window:</span>
                <span className="text-[#F0FEF8]">{m.context}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Security & Zero-Leak Credential Guard */}
      <section id="security" className="py-20 border-t border-[#F0FEF8]/10 bg-[#0a0f0d]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="text-xs font-mono text-[#1CE172] uppercase">Security Architecture</div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Master Secret Boundaries. Zero Leakage.
              </h2>
              <p className="text-sm text-[#889e93] leading-relaxed">
                Morvexa never stores plaintext API secrets. Customer keys are hashed with
                authoritative SHA-256 standard and verified in constant time. Third-party provider
                secrets are guarded by server-side envelope isolation.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-[#F0FEF8]/10 bg-[#010302]">
                  <CheckCircle2 className="h-4 w-4 text-[#1CE172] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#F0FEF8] font-semibold">Display Plaintext Once:</span>
                    <p className="text-[#889e93] mt-0.5">Secrets are only visible during creation and never recorded in plain database fields or client localStorage.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-[#F0FEF8]/10 bg-[#010302]">
                  <CheckCircle2 className="h-4 w-4 text-[#1CE172] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#F0FEF8] font-semibold">Tenant Isolation RLS:</span>
                    <p className="text-[#889e93] mt-0.5">Transactions, quota records, and audit events strictly enforce organization boundaries.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-[#F0FEF8]/10 bg-[#010302]">
                  <CheckCircle2 className="h-4 w-4 text-[#1CE172] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#F0FEF8] font-semibold">Token Bucket Rate Limiting:</span>
                    <p className="text-[#889e93] mt-0.5">Guards against DDoS and runaway billing spikes with dynamic retry-after headers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-[#F0FEF8]/10 bg-[#010302] space-y-6">
              <div className="flex items-center justify-between border-b border-[#F0FEF8]/10 pb-4">
                <span className="text-xs font-mono text-[#889e93]">THREAT MITIGATION</span>
                <span className="text-xs font-mono text-[#1CE172]">OWASP COMPLIANT</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-lg bg-[#0a0f0d] border border-[#F0FEF8]/5">
                  <div className="text-[#889e93]">Hashing Method</div>
                  <div className="text-[#F0FEF8] font-bold mt-1">SHA-256 (CSPRNG)</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0a0f0d] border border-[#F0FEF8]/5">
                  <div className="text-[#889e93]">BYOK Envelope</div>
                  <div className="text-[#F0FEF8] font-bold mt-1">AES-256-GCM</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0a0f0d] border border-[#F0FEF8]/5">
                  <div className="text-[#889e93]">IDOR Protection</div>
                  <div className="text-[#1CE172] font-bold mt-1">Active on All Endpoints</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0a0f0d] border border-[#F0FEF8]/5">
                  <div className="text-[#889e93]">Cron Security</div>
                  <div className="text-[#1CE172] font-bold mt-1">Bearer Auth Guarded</div>
                </div>
              </div>

              <button
                onClick={() => onEnterDashboard("guardrails")}
                className="w-full py-2.5 rounded-lg border border-[#1CE172]/40 text-[#1CE172] hover:bg-[#1CE172]/10 font-mono text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Inspect Security Baseline</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Configurable Pricing Section */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-mono text-[#1CE172] mb-2 uppercase">Transparent Plans</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Flexible Infrastructure</h2>
          <p className="text-[#889e93] text-sm mt-3">
            Start free with sandbox capabilities, scale to dedicated proxy clusters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Developer",
              price: "Rp 0",
              period: "/ month",
              desc: "Ideal for testing, local evaluation, and prototyping.",
              features: [
                "100 Standard Requests / 5h",
                "157k Daily Token Allowance",
                "Community Shared Mesh",
                "Midtrans Sandbox Checkout",
              ],
              cta: "Launch Sandbox",
              popular: false,
              tab: "playground" as NavTabId,
            },
            {
              name: "Pro Master",
              price: "Rp 750.000",
              period: "/ month",
              desc: "For production startups requiring zero-buffer SLA and failover.",
              features: [
                "Unlimited Model Routing",
                "Multi-Provider Failover Mesh",
                "60 RPM Rate Limit Enforcement",
                "Authoritative Audit Ledger",
                "Automated Reconciliation",
              ],
              cta: "Upgrade to Pro",
              popular: true,
              tab: "billing" as NavTabId,
            },
            {
              name: "Dedicated Apex",
              price: "Rp 2.500.000",
              period: "/ month",
              desc: "Dedicated enterprise proxy host with isolated network egress.",
              features: [
                "Custom Dedicated Egress Host",
                "BYOK Secure Vault (AES-256)",
                "Custom RPM & Rate Allowlist",
                "Priority Singapore Low-Latency Route",
                "Dedicated Health Probing Daemon",
              ],
              cta: "Deploy Dedicated",
              popular: false,
              tab: "infrastructure" as NavTabId,
            },
          ].map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-8 border flex flex-col justify-between relative ${
                plan.popular
                  ? "border-[#1CE172] bg-[#0a0f0d] shadow-[0_0_35px_rgba(28,225,114,0.15)]"
                  : "border-[#F0FEF8]/10 bg-[#010302]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1CE172] text-[#010302] text-[10px] font-mono font-bold uppercase tracking-wider">
                  RECOMMENDED
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-[#F0FEF8]">{plan.name}</h3>
                <p className="text-xs text-[#889e93] mt-2">{plan.desc}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#F0FEF8]">{plan.price}</span>
                  <span className="text-xs font-mono text-[#889e93]">{plan.period}</span>
                </div>

                <div className="space-y-3 mt-8 font-mono text-xs">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 text-[#F0FEF8]">
                      <Check className="h-3.5 w-3.5 text-[#1CE172] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onEnterDashboard(plan.tab)}
                className={`w-full mt-8 py-3 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                  plan.popular
                    ? "bg-[#1CE172] text-[#010302] hover:bg-[#1CE172]/90 shadow-[0_0_20px_rgba(28,225,114,0.3)]"
                    : "border border-[#F0FEF8]/20 text-[#F0FEF8] hover:bg-[#F0FEF8]/5"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-[#F0FEF8]/10 bg-[#010302] py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-mono text-[#889e93]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#F0FEF8]">Morvexa</span>
            <span>—</span>
            <span>AI Server Master Architecture</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onEnterDashboard("overview")}
              className="hover:text-[#1CE172] transition-colors cursor-pointer"
            >
              Control Plane
            </button>
            <a
              href="/api/v1/metrics"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1CE172] transition-colors"
            >
              Live Telemetry Status
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1CE172] transition-colors"
            >
              Documentation
            </a>
          </div>

          <div className="text-[11px] text-[#4d6357]">
            © {new Date().getFullYear()} Morvexa. Free-Tier First, Universal AI Gateway.
          </div>
        </div>
      </footer>
    </div>
  );
}
