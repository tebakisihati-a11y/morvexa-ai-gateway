"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Cpu,
  Zap,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  Search,
  ExternalLink,
  Code2,
  Server,
  Sparkles,
  Layers,
} from "lucide-react";
import { MODEL_REGISTRY } from "@/lib/gateway/adapters";

export default function ApiCatalogPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "openai" | "anthropic">("curl");

  const models = Object.values(MODEL_REGISTRY);

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase());

    const matchesProvider =
      selectedProvider === "all" || m.provider.toLowerCase() === selectedProvider.toLowerCase();

    return matchesSearch && matchesProvider;
  });

  const providers = ["all", "anthropic", "openai", "deepseek", "gemini", "groq", "custom"];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeSnippets = {
    curl: `curl https://morvexa-sistem.vercel.app/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer mvx_live_YOUR_SECRET_KEY" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "messages": [
      {"role": "user", "content": "Halo Morvexa Gateway!"}
    ],
    "temperature": 0.7
  }'`,
    openai: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "mvx_live_YOUR_SECRET_KEY",
  baseURL: "https://morvexa-sistem.vercel.app/api/v1",
});

const response = await client.chat.completions.create({
  model: "deepseek-chat", // atau "claude-3-7-sonnet", "gpt-4o"
  messages: [{ role: "user", content: "Jelaskan arsitektur edge." }],
});

console.log(response.choices[0].message.content);`,
    anthropic: `import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "mvx_live_YOUR_SECRET_KEY",
  baseURL: "https://morvexa-sistem.vercel.app/api", // Native /v1/messages compatibility
});

const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Halo dari SDK Anthropic!" }],
});

console.log(message.content);`,
  };

  return (
    <div className="min-h-screen bg-[#06070F] text-[#E9EDFB] font-sans selection:bg-[#5B8DEF]/20 selection:text-[#5B8DEF]">
      {/* Top Header */}
      <header className="border-b border-[#5B8DEF]/15 bg-[#06070F]/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/owner"
            className="flex items-center gap-1.5 text-xs font-mono text-[#8E97BC] hover:text-[#5B8DEF] transition-colors p-1.5 rounded-lg border border-white/5 bg-white/[0.02]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Control Plane</span>
          </Link>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#2A3576] text-[#06070F] flex items-center justify-center font-mono text-xs font-bold shadow-md shadow-[#5B8DEF]/20">
              M
            </div>
            <span className="font-bold text-sm text-[#E9EDFB] tracking-tight">
              Morvexa API Catalog & Specs
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5B8DEF]/10 text-[#5B8DEF] border border-[#5B8DEF]/20">
              v1.0.0 OpenAPI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/api/v1/models"
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-mono text-[#8E97BC] hover:text-white transition-colors"
          >
            <span>Raw JSON</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="/customer"
            className="text-xs font-mono px-3 py-1.5 rounded-xl border border-[#5B8DEF]/30 bg-[#5B8DEF]/10 text-[#5B8DEF] hover:bg-[#5B8DEF]/20 transition-all font-semibold"
          >
            Portal Kustomer →
          </Link>
        </div>
      </header>

      {/* Hero & Quick Specs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#5B8DEF]/30 bg-[#5B8DEF]/5 text-[#5B8DEF] text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Universal Unified Endpoint Protocol</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E9EDFB] tracking-tight">
            Katalog Model AI & Panduan Integrasi
          </h1>
          <p className="text-sm sm:text-base text-[#8E97BC] max-w-3xl leading-relaxed">
            Satu endpoint universal untuk mengakses model mutakhir dunia (Claude, GPT-4o, DeepSeek, Gemini) dengan otomatisasi failover, streaming SSE berkecepatan tinggi (&lt;15ms), proteksi kuota token, dan enkripsi BYOK.
          </p>
        </div>

        {/* Quick Endpoint Reference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B0D1A] p-5 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5B8DEF] font-semibold flex items-center gap-2">
              <Server className="h-3.5 w-3.5" />
              <span>Base API URL</span>
            </div>
            <div className="font-mono text-xs text-[#E9EDFB] bg-[#06070F] border border-white/5 p-2.5 rounded-xl select-all flex items-center justify-between">
              <span>https://morvexa-sistem.vercel.app/api/v1</span>
              <button
                onClick={() => handleCopy("base", "https://morvexa-sistem.vercel.app/api/v1")}
                className="text-zinc-500 hover:text-[#5B8DEF]"
              >
                {copiedId === "base" ? <Check className="h-3.5 w-3.5 text-[#5B8DEF]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[#8E97BC]">Dukungan standar kompatibel 100% OpenAI & Anthropic SDK.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0D1A] p-5 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5B8DEF] font-semibold flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Autentikasi Header</span>
            </div>
            <div className="font-mono text-xs text-[#E9EDFB] bg-[#06070F] border border-white/5 p-2.5 rounded-xl select-all flex items-center justify-between">
              <span>Authorization: Bearer mvx_live_...</span>
              <button
                onClick={() => handleCopy("auth", "Authorization: Bearer mvx_live_...")}
                className="text-zinc-500 hover:text-[#5B8DEF]"
              >
                {copiedId === "auth" ? <Check className="h-3.5 w-3.5 text-[#5B8DEF]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[#8E97BC]">Gunakan kunci yang dikirim ke email setelah langganan aktif.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0D1A] p-5 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5B8DEF] font-semibold flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              <span>Smart Failover Mesh</span>
            </div>
            <div className="font-mono text-xs text-[#E9EDFB] bg-[#06070F] border border-white/5 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-[#5B8DEF]">Automatic Re-routing</span>
              <span className="h-2 w-2 rounded-full bg-[#5B8DEF] animate-pulse" />
            </div>
            <p className="text-[11px] text-[#8E97BC]">Bila provider upstream 429 rate limit, dialihkan ke model setara secara mulus.</p>
          </div>
        </div>

        {/* Code Snippets Integration Guide */}
        <div className="rounded-3xl border border-white/10 bg-[#0B0D1A] overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#5B8DEF]" />
              <h2 className="text-sm font-mono font-bold text-[#E9EDFB] uppercase tracking-wider">
                Contoh Integrasi Cepat (Quickstart)
              </h2>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070F] border border-white/5">
              <button
                onClick={() => setActiveSnippetTab("curl")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  activeSnippetTab === "curl"
                    ? "bg-[#5B8DEF]/20 text-[#5B8DEF] font-bold border border-[#5B8DEF]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveSnippetTab("openai")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  activeSnippetTab === "openai"
                    ? "bg-[#5B8DEF]/20 text-[#5B8DEF] font-bold border border-[#5B8DEF]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                OpenAI SDK
              </button>
              <button
                onClick={() => setActiveSnippetTab("anthropic")}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  activeSnippetTab === "anthropic"
                    ? "bg-[#5B8DEF]/20 text-[#5B8DEF] font-bold border border-[#5B8DEF]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Anthropic SDK
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-[#06070F] relative">
            <button
              onClick={() => handleCopyCode(activeSnippetTab, codeSnippets[activeSnippetTab])}
              className="absolute right-6 top-6 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              {copiedCode === activeSnippetTab ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#5B8DEF]" />
                  <span className="text-[#5B8DEF]">Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>

            <pre className="font-mono text-xs sm:text-sm text-[#E9EDFB] overflow-x-auto leading-relaxed p-2">
              <code>{codeSnippets[activeSnippetTab]}</code>
            </pre>
          </div>
        </div>

        {/* Models Catalog Explorer */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#E9EDFB] tracking-tight">
                Daftar Model Tersedia ({filteredModels.length})
              </h2>
              <p className="text-xs text-[#8E97BC] font-mono mt-0.5">
                Ketik nama model ini pada parameter `model` di request payload Anda.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari model (e.g. claude, gpt, flash)..."
                className="w-full bg-[#0B0D1A] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-[#E9EDFB] placeholder:text-zinc-600 focus:outline-none focus:border-[#5B8DEF]/50"
              />
            </div>
          </div>

          {/* Provider Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {providers.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProvider(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                  selectedProvider === p
                    ? "bg-[#5B8DEF]/20 text-[#5B8DEF] font-bold border border-[#5B8DEF]/40"
                    : "text-zinc-400 hover:text-white bg-white/5 border border-transparent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredModels.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#0B0D1A]/90 hover:border-[#5B8DEF]/40 p-5 space-y-4 transition-all group shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#8E97BC]">
                      {item.provider}
                    </span>
                    <h3 className="font-bold text-base text-[#E9EDFB] mt-2 group-hover:text-[#5B8DEF] transition-colors">
                      {item.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleCopy(item.id, item.id)}
                    className="p-1.5 rounded-lg border border-white/5 text-zinc-500 hover:text-[#5B8DEF] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                    title="Salin Model ID"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-4 w-4 text-[#5B8DEF]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="font-mono text-xs bg-[#06070F] border border-white/5 p-2 rounded-lg text-zinc-300 select-all">
                  model: &quot;{item.id}&quot;
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-white/5 text-[#8E97BC]">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Context Window</div>
                    <div className="text-[#E9EDFB] font-semibold mt-0.5">
                      {(item.contextWindow / 1000).toLocaleString()}k tokens
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Input / Output Rate</div>
                    <div className="text-[#E9EDFB] font-semibold mt-0.5">
                      ${item.inputCostPer1k} / ${item.outputCostPer1k} per 1k
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-[#8E97BC]">
                  {item.supportsStreaming && (
                    <span className="flex items-center gap-1 text-[#5B8DEF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5B8DEF]" />
                      <span>SSE Stream</span>
                    </span>
                  )}
                  {item.supportsToolCalling && (
                    <span className="flex items-center gap-1 text-[#8E97BC]">
                      <span>•</span>
                      <span>Function Calling</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
