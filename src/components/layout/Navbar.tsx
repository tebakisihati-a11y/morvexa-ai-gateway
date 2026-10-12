"use client";

import React, { useState } from "react";
import { EdgeStatusRadar } from "./EdgeStatusRadar";
import { Cpu, Terminal, ExternalLink, Menu, X, Sparkles, LayoutDashboard } from "lucide-react";
import type { NavTabId } from "./Sidebar";

interface NavbarProps {
  currentTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  viewMode?: "landing" | "console";
  onToggleViewMode?: (mode: "landing" | "console") => void;
  customBadge?: React.ReactNode;
}

export function Navbar({
  currentTab,
  onTabChange,
  viewMode = "console",
  onToggleViewMode,
  customBadge,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTabId; label: string }[] = [
    { id: "overview", label: "Overview & Quota" },
    { id: "keys", label: "API Keys & Policies" },
    { id: "billing", label: "Billing & Subscriptions" },
    { id: "infrastructure", label: "Hybrid Infrastructure" },
    { id: "nexus", label: "Nexus Control Plane" },
    { id: "routing", label: "Model Routing & Failover" },
    { id: "playground", label: "Streaming Playground" },
    { id: "traces", label: "Live Traces & Logs" },
    { id: "guardrails", label: "Guardrails & Deploy" },
  ];

  const handleSelectTab = (tab: NavTabId) => {
    onTabChange(tab);
    if (viewMode === "landing" && onToggleViewMode) {
      onToggleViewMode("console");
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 border-b border-[#1CE172]/15 bg-[#010302]/90 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white bg-white/5 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div
            onClick={() => onToggleViewMode?.("landing")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#1CE172] via-[#355C49] to-[#010302] flex items-center justify-center font-mono font-bold text-xs text-[#010302] shadow-md shadow-[#1CE172]/20 group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-semibold tracking-tight text-sm text-[#F0FEF8]">
                Morvexa
              </span>
              <span className="text-[#889e93] font-mono text-[11px] hidden sm:inline">
                / master-server
              </span>
            </div>
          </div>
        </div>

        {/* Global Telemetry & Status & View Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher Toggle */}
          {onToggleViewMode && (
            <div className="flex items-center p-0.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono">
              <button
                onClick={() => onToggleViewMode("landing")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "landing"
                    ? "bg-[#5449ab]/50 text-white font-medium border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="h-3 w-3 text-[#c03fb5]" />
                <span className="hidden sm:inline">Experience</span>
              </button>
              <button
                onClick={() => onToggleViewMode("console")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "console"
                    ? "bg-[#c03fb5]/40 text-white font-medium border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <LayoutDashboard className="h-3 w-3 text-[#aca3e1]" />
                <span className="hidden sm:inline">Console</span>
              </button>
            </div>
          )}

          <EdgeStatusRadar />

          {customBadge && (
            <div className="flex items-center">
              {customBadge}
            </div>
          )}

          <a
            href="/api/v1/models"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-[#1CE172]/80 hover:text-[#1CE172] border border-[#1CE172]/20 px-2.5 py-1 rounded-lg transition-colors bg-[#1CE172]/5"
          >
            <Terminal className="h-3 w-3 text-[#1CE172]" />
            <span>API Catalog</span>
            <ExternalLink className="h-2.5 w-2.5 text-zinc-500" />
          </a>

          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-white/10 rounded-lg text-[11px] font-mono text-zinc-300 bg-white/[0.02]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1CE172]" />
            <span className="hidden sm:inline">edge_active</span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Phone / Smartphone screens) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-50 bg-[#06040d] border-b border-white/10 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#aca3e1] font-semibold mb-2">
            Navigation Menu
          </div>
          <div className="grid grid-cols-1 gap-1">
            <button
              onClick={() => {
                onToggleViewMode?.("landing");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-mono text-left bg-[#1a0b2e]/60 border border-purple-500/30 text-white"
            >
              <span>✨ 3D Experience (Landing)</span>
            </button>

            {navItems.map((item) => {
              const isActive = currentTab === item.id && viewMode === "console";
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-mono transition-colors text-left ${
                    isActive
                      ? "bg-white/10 text-white font-semibold border border-white/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-[#c03fb5] text-xs">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

