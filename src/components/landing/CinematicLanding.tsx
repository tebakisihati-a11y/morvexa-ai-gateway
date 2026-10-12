"use client";

import React, { useState } from "react";
import {
  Cpu,
  Layers,
  ArrowRight,
  Shield,
  Zap,
  Activity,
  Terminal,
  ExternalLink,
  ChevronRight,
  KeyRound,
  GitBranch,
  Play,
  CheckCircle2,
  Lock,
  Globe,
  Server,
  Database,
  Sliders,
  Sparkles,
} from "lucide-react";
import { IntelligenceCore3D } from "./IntelligenceCore3D";
import type { NavTabId } from "../layout/Sidebar";

interface CinematicLandingProps {
  onOpenConsole: (targetTab?: NavTabId) => void;
}

export function CinematicLanding({ onOpenConsole }: CinematicLandingProps) {
  const [activeArchitectureLayer, setActiveArchitectureLayer] = useState<number>(0);
  const [previewTab, setPreviewTab] = useState<"routing" | "traces" | "playground" | "quota">("routing");

  const architectureLayers = [
    {
      title: "01 / Ingress & Client Layer",
      desc: "Single unified API endpoint accepting standard Anthropic and OpenAI SDK payloads over HTTP and WebSocket protocols.",
      metrics: "Global Edge Anycast · Zero SDK migration required",
      badge: "Ingress",
    },
    {
      title: "02 / Zero-Plaintext Security & Guardrails",
      desc: "SHA-256 authenticated API keys, regex-based PII redaction (CC, SSN, API secrets), and semantic prompt caching.",
      metrics: "<2ms latency impact · 100% encrypted in-flight",
      badge: "Security",
    },
    {
      title: "03 / Multi-Tier Sliding Quota Engine",
      desc: "Deterministic rate-limiting with 5-hour rolling TTL auto-recovery slots and 7-day token ceiling budgets.",
      metrics: "Automatic slot restoration · Zero quota deadlocks",
      badge: "Quota",
    },
    {
      title: "04 / Deterministic Model Routing & Failover",
      desc: "Direct prioritization to Localhost:5002 daemon with instantaneous sub-150ms failover to Anthropic, DeepSeek, and Groq.",
      metrics: "<150ms failover budget · 99.99% availability",
      badge: "Routing",
    },
    {
      title: "05 / Real-Time Audit Telemetry & Observability",
      desc: "Synchronous TTFT tracking, token velocity monitoring, prompt cache verification, and execution trace logging.",
      metrics: "Live SSE frame logging · Full request replay",
      badge: "Observability",
    },
  ];

  const capabilities = [
    {
      title: "Universal AI Gateway",
      tagline: "One schema for all frontier & local models",
      desc: "Eliminate vendor lock-in. Route prompts effortlessly across Claude 3.7 Sonnet, DeepSeek V3, GPT-4o, and private local instances using standard headers.",
      icon: Cpu,
      accent: "from-purple-500/20 to-indigo-500/10",
      border: "border-purple-500/30",
    },
    {
      title: "Sub-150ms Auto-Failover",
      tagline: "Uninterrupted inference on 429 & 5xx errors",
      desc: "If upstream providers rate-limit or drop connections, Morvexa reroutes in-flight requests to healthy fallback nodes within 150ms without user interruption.",
      icon: GitBranch,
      accent: "from-pink-500/20 to-purple-500/10",
      border: "border-pink-500/30",
    },
    {
      title: "Dual Rolling Quota Engine",
      tagline: "Continuous sliding window recovery",
      desc: "Traditional quotas lock teams out for 24 hours. Morvexa's 5-hour sliding TTL recovers consumed slots continuously as each request ages out.",
      icon: Activity,
      accent: "from-emerald-500/20 to-cyan-500/10",
      border: "border-emerald-500/30",
    },
    {
      title: "Zero-Buffer SSE Streaming",
      tagline: "Raw chunk passthrough with sub-20ms TTFT",
      desc: "High-performance streaming engine designed for low-latency coding agents and conversational UIs. Zero memory buffering on intermediate nodes.",
      icon: Zap,
      accent: "from-cyan-500/20 to-blue-500/10",
      border: "border-cyan-500/30",
    },
    {
      title: "PII Sanitization & WAF",
      tagline: "Zero-plaintext cryptographic protection",
      desc: "Sanitize customer PII (credit cards, API keys, credentials) before prompt dispatch. Keys are verified via irreversible SHA-256 salted hashes.",
      icon: Shield,
      accent: "from-amber-500/20 to-orange-500/10",
      border: "border-amber-500/30",
    },
    {
      title: "Real-Time Trace Observability",
      tagline: "Audit every prompt, token, and cache hit",
      desc: "Comprehensive diagnostic traces logging Time-To-First-Token, duration, token usage, prompt cache savings, and failover hop records.",
      icon: Terminal,
      accent: "from-violet-500/20 to-fuchsia-500/10",
      border: "border-violet-500/30",
    },
  ];

  return (
    <div className="relative min-h-screen text-zinc-100 radial-grid-bg">
      {/* Floating Header */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#020205]/80 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#c03fb5] via-[#5449ab] to-[#1a0b2e] flex items-center justify-center font-mono font-bold text-sm text-white shadow-lg shadow-purple-500/20 border border-white/20">
            M
          </div>
          <div>
            <span className="font-semibold tracking-tight text-sm text-[#f7f8fd]">MORVEXA</span>
            <span className="text-[#aca3e1] font-mono text-[11px] ml-2 hidden sm:inline">
              / next-gen ai gateway
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-mono text-[#aca3e1]">
          <a href="#capabilities" className="hover:text-white transition-colors">Platform</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#routing" className="hover:text-white transition-colors">Model Mesh</a>
          <a href="/api/v1/models" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
            API Spec <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenConsole("playground")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => onOpenConsole("overview")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c03fb5] via-[#a6085b] to-[#5449ab] hover:opacity-95 text-xs font-mono font-semibold text-white shadow-md shadow-pink-500/20 transition-all cursor-pointer"
          >
            <span>Enter Console</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative pt-12 pb-20 px-4 sm:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#aca3e1]/20 bg-[#1a0b2e]/60 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#c03fb5] animate-pulse" />
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#aca3e1] font-medium">
                INTELLIGENT AI INFRASTRUCTURE
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#f7f8fd] leading-[1.08]">
              One Gateway. <br />
              <span className="bg-gradient-to-r from-[#f7f8fd] via-[#aca3e1] to-[#c03fb5] bg-clip-text text-transparent">
                Infinite Intelligence.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#aca3e1]/90 max-w-xl font-normal leading-relaxed">
              Route, observe, and govern AI workloads through one unified infrastructure layer. Connect frontier models, private nodes, automatic failovers, and rolling quotas in sub-150ms.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenConsole("playground")}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#c03fb5] via-[#a6085b] to-[#5449ab] hover:shadow-lg hover:shadow-pink-500/25 text-sm font-mono font-semibold text-white transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Open Playground</span>
              </button>

              <button
                onClick={() => onOpenConsole("routing")}
                className="px-5 py-3 rounded-xl glass-panel-interactive text-sm font-mono text-[#f7f8fd] transition-all flex items-center gap-2 cursor-pointer"
              >
                <GitBranch className="h-4 w-4 text-[#aca3e1]" />
                <span>Explore Architecture</span>
              </button>
            </div>

            {/* Micro Live Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/10 max-w-lg">
              <div>
                <div className="text-xl font-mono font-bold text-[#f7f8fd]">100%</div>
                <div className="text-[11px] font-mono text-[#aca3e1]">Free Tier Hosting</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-emerald-400">&lt;150ms</div>
                <div className="text-[11px] font-mono text-[#aca3e1]">Auto-Failover Budget</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-[#c03fb5]">5-Hour</div>
                <div className="text-[11px] font-mono text-[#aca3e1]">Sliding Quota Recovery</div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Intelligence Core Interactive Canvas */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <IntelligenceCore3D />
          </div>
        </div>
      </section>

      {/* SECTION 2: LIVE INFRASTRUCTURE STRIP */}
      <section className="border-y border-white/10 bg-[#06040d]/90 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-200 font-semibold">GATEWAY MESH:</span>
            <span className="text-emerald-400">OPERATIONAL</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-zinc-400 text-[11px]">
            <div>
              <span className="text-zinc-500">CONNECTED PROVIDERS:</span>{" "}
              <span className="text-zinc-200">6 (Local + Cloud)</span>
            </div>
            <div>
              <span className="text-zinc-500">EDGE INGRESS:</span>{" "}
              <span className="text-zinc-200">38.4 req/s</span>
            </div>
            <div>
              <span className="text-zinc-500">MEDIAN TTFT:</span>{" "}
              <span className="text-emerald-400">142ms</span>
            </div>
            <div>
              <span className="text-zinc-500">FAILOVER CIRCUIT:</span>{" "}
              <span className="text-[#aca3e1]">STANDBY</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PLATFORM CAPABILITIES */}
      <section id="capabilities" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[#c03fb5] font-semibold">
            PLATFORM CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f7f8fd]">
            Enterprise AI Routing & Governance
          </h2>
          <p className="text-sm text-[#aca3e1] leading-relaxed">
            Engineered specifically to solve the fragility of single-provider setups, silent 429 timeouts, and unmonitored API expenses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl glass-panel-interactive flex flex-col justify-between border ${c.border}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[#f7f8fd]">
                      <Icon className="h-5 w-5 text-[#aca3e1]" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">0{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[#f7f8fd] tracking-tight">{c.title}</h3>
                    <div className="text-xs font-mono text-[#c03fb5] mt-0.5">{c.tagline}</div>
                  </div>

                  <p className="text-xs text-[#aca3e1] leading-relaxed font-sans">{c.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>verified architecture</span>
                  <span className="text-[#c03fb5]">active</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE PRODUCT PREVIEW CONSOLE */}
      <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#c03fb5] font-semibold">
              DEVELOPER CONSOLE PREVIEW
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f7f8fd] mt-1">
              Live Gateway Controls in Action
            </h2>
          </div>

          {/* Interactive Preview Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
            {[
              { id: "routing", label: "Model Routing" },
              { id: "traces", label: "Trace Stream" },
              { id: "playground", label: "SSE Playground" },
              { id: "quota", label: "Rolling Quotas" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPreviewTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  previewTab === tab.id
                    ? "bg-[#5449ab]/40 text-white font-medium border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Console Mock Frame */}
        <div className="rounded-2xl border border-white/15 bg-[#0a0714] shadow-2xl overflow-hidden">
          {/* Console Window Topbar */}
          <div className="px-4 py-3 border-b border-white/10 bg-[#07050e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2">morvexa-core-prod · 2026.10</span>
            </div>

            <button
              onClick={() => onOpenConsole(previewTab as NavTabId)}
              className="text-xs font-mono text-[#aca3e1] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Full Screen</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="p-6">
            {previewTab === "routing" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-zinc-500 text-[10px]">PRIMARY NODE</span>
                    <div className="font-semibold text-purple-300 mt-1">Localhost:5002</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">8ms · Local Private</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-zinc-500 text-[10px]">HOP 01 (CLOUD)</span>
                    <div className="font-semibold text-emerald-400 mt-1">Claude 3.7 Sonnet</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">142ms · Upstream</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-zinc-500 text-[10px]">HOP 02 (FALLBACK)</span>
                    <div className="font-semibold text-cyan-400 mt-1">DeepSeek V3</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">98ms · On 429/5xx</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <span className="text-zinc-500 text-[10px]">HOP 03 (CIRCUIT)</span>
                    <div className="font-semibold text-pink-400 mt-1">Groq LPU</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">45ms · Emergency</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-zinc-300 overflow-x-auto">
                  <div className="text-zinc-500">// Sample Gateway Failover Topology Ingestion</div>
                  <div className="text-emerald-400 mt-1">&gt; POST /api/v1/messages → Primary node checked [8ms: PASS]</div>
                  <div className="text-zinc-400">&gt; Prompt dispatch verified · PII sanitized · 0 tokens leaked</div>
                </div>
              </div>
            )}

            {previewTab === "traces" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-6 gap-2 text-[10px] uppercase text-zinc-500 pb-2 border-b border-white/5 font-semibold">
                  <span>Status</span>
                  <span>Model</span>
                  <span>Provider</span>
                  <span>TTFT</span>
                  <span>Duration</span>
                  <span className="text-right">Action</span>
                </div>
                {[
                  { status: "200 OK", model: "claude-3-7-sonnet", prov: "Anthropic", ttft: "142ms", dur: "1280ms" },
                  { status: "200 OK", model: "deepseek-chat", prov: "DeepSeek", ttft: "98ms", dur: "910ms" },
                  { status: "200 OK", model: "gemini-2.0-flash", prov: "Google", ttft: "45ms", dur: "420ms" },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 items-center py-2 border-b border-white/5 text-zinc-300">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {row.status}
                    </span>
                    <span>{row.model}</span>
                    <span className="text-zinc-400">{row.prov}</span>
                    <span className="text-emerald-400">{row.ttft}</span>
                    <span>{row.dur}</span>
                    <span className="text-right text-[#aca3e1] hover:underline cursor-pointer" onClick={() => onOpenConsole("traces")}>
                      view_trace &gt;
                    </span>
                  </div>
                ))}
              </div>
            )}

            {previewTab === "playground" && (
              <div className="p-4 rounded-xl bg-black/60 border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Model: <span className="text-white">claude-3-7-sonnet</span></span>
                  <span className="text-emerald-400">TTFT: 142ms · Velocity: 84 t/s</span>
                </div>
                <div className="p-3 rounded bg-white/[0.02] border border-white/5 text-zinc-200">
                  Morvexa AI Gateway routes requests with zero-buffer SSE streaming, ensuring seamless model switching and instant time-to-first-token.
                </div>
                <button
                  onClick={() => onOpenConsole("playground")}
                  className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-medium cursor-pointer"
                >
                  Open in Interactive Playground
                </button>
              </div>
            )}

            {previewTab === "quota" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-300">Standard Tier (5h Window)</span>
                    <span className="text-emerald-400">100 / 100 req available</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 w-full" />
                  </div>
                  <p className="text-[11px] text-zinc-500">Each consumed request recovers precisely 300 minutes after dispatch.</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-300">Frontier Budget (24h Window)</span>
                    <span className="text-orange-400">157.1k / 157.1k tokens</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 w-full" />
                  </div>
                  <p className="text-[11px] text-zinc-500">Prevents runaway token billing across shared organization API keys.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: LAYERED ARCHITECTURE BREAKDOWN */}
      <section id="architecture" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[#c03fb5] font-semibold">
            SYSTEM ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f7f8fd]">
            Layered Execution Topography
          </h2>
          <p className="text-sm text-[#aca3e1]">
            How every inference traverses Morvexa from edge client to upstream model response.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Layer Selector */}
          <div className="lg:col-span-5 space-y-2">
            {architectureLayers.map((layer, idx) => (
              <button
                key={idx}
                onClick={() => setActiveArchitectureLayer(idx)}
                className={`w-full p-4 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between border ${
                  activeArchitectureLayer === idx
                    ? "bg-[#1a0b2e] border-[#c03fb5] shadow-lg shadow-purple-500/10 text-white"
                    : "glass-panel-interactive border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div>
                  <div className="text-xs font-mono font-semibold">{layer.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{layer.metrics}</div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {layer.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Active Layer Deep Dive Visual */}
          <div className="lg:col-span-7 rounded-2xl glass-panel p-6 sm:p-8 space-y-6 border border-white/15">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-xs font-mono text-[#c03fb5] font-semibold">
                ACTIVE LAYER INSPECTION
              </span>
              <span className="text-xs font-mono text-zinc-500">
                L{activeArchitectureLayer + 1} OF 05
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#f7f8fd]">
                {architectureLayers[activeArchitectureLayer].title}
              </h3>
              <p className="text-sm text-[#aca3e1] mt-2 leading-relaxed">
                {architectureLayers[activeArchitectureLayer].desc}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs">
              <div className="text-zinc-500">// Layer Telemetry Performance</div>
              <div className="text-emerald-400 font-semibold">
                {architectureLayers[activeArchitectureLayer].metrics}
              </div>
            </div>

            <button
              onClick={() => onOpenConsole("routing")}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Inspect in Routing Controls</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL HIGH-IMPACT CTA */}
      <section className="py-24 px-4 sm:px-8 max-w-5xl mx-auto text-center space-y-6 relative overflow-hidden">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#1a0b2e] to-[#0a0714] border border-[#c03fb5]/30 shadow-2xl space-y-6 relative">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#c03fb5] to-[#5449ab] mx-auto flex items-center justify-center font-mono font-bold text-lg text-white shadow-lg shadow-purple-500/30">
            M
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8fd]">
            Your AI Infrastructure. <br />
            <span className="bg-gradient-to-r from-[#aca3e1] to-[#c03fb5] bg-clip-text text-transparent">
              One Intelligent Layer.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#aca3e1] max-w-xl mx-auto leading-relaxed">
            Bring model access, routing, and observability into one coherent developer experience. Free deployment ready with zero server maintenance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenConsole("overview")}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c03fb5] via-[#a6085b] to-[#5449ab] hover:opacity-95 text-sm font-mono font-semibold text-white shadow-xl shadow-pink-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Enter Morvexa Console</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onOpenConsole("playground")}
              className="px-6 py-3.5 rounded-xl glass-panel-interactive text-sm font-mono text-[#f7f8fd] transition-all cursor-pointer"
            >
              Test Live Streaming
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 7: FOOTER */}
      <footer className="border-t border-white/10 bg-[#020205] py-12 px-4 sm:px-8 text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded bg-[#c03fb5] text-white flex items-center justify-center font-bold text-[10px]">
              M
            </div>
            <span className="text-zinc-300 font-medium">Morvexa AI Gateway</span>
            <span className="text-zinc-600">· Version 2026.10</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => onOpenConsole("overview")} className="hover:text-zinc-300 cursor-pointer">Console</button>
            <button onClick={() => onOpenConsole("keys")} className="hover:text-zinc-300 cursor-pointer">API Keys</button>
            <button onClick={() => onOpenConsole("routing")} className="hover:text-zinc-300 cursor-pointer">Routing</button>
            <button onClick={() => onOpenConsole("playground")} className="hover:text-zinc-300 cursor-pointer">Playground</button>
            <button onClick={() => onOpenConsole("traces")} className="hover:text-zinc-300 cursor-pointer">Traces</button>
            <a href="/api/v1/models" target="_blank" rel="noreferrer" className="hover:text-zinc-300">API Docs</a>
          </div>

          <div>
            <span>Edge Mesh: </span>
            <span className="text-emerald-400 font-semibold">Healthy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
