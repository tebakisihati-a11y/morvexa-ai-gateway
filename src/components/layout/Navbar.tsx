"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EdgeStatusRadar } from "./EdgeStatusRadar";
import { Terminal, ExternalLink, Menu, X, Sparkles, LayoutDashboard } from "lucide-react";
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
    { id: "overview", label: "Command Center" },
    { id: "provisioning", label: "Key Provisioning & Auto" },
    { id: "resolver", label: "Customer Doctor & Triage" },
    { id: "customers", label: "Database Kustomer & Aktivitas" },
    { id: "keys", label: "API Keys & Policies" },
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
      <header className="h-14 border-b border-white/[0.08] bg-[#07090b]/90 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
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
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-950 flex items-center justify-center font-mono font-bold text-xs text-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-semibold tracking-tight text-sm text-[#f4f4f5]">
                Morvexa
              </span>
              <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline">
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
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "landing"
                    ? "bg-white/10 text-white font-medium border border-white/10"
                    : "text-zinc-400 hover:text-[#f4f4f5]"
                }`}
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span className="hidden sm:inline">Experience</span>
              </button>
              <button
                onClick={() => onToggleViewMode("console")}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "console"
                    ? "bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30"
                    : "text-zinc-400 hover:text-[#f4f4f5]"
                }`}
              >
                <LayoutDashboard className="h-3 w-3 text-emerald-400" />
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

          <Link
            href="/catalog"
            className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all bg-emerald-500/10 hover:bg-emerald-500/20"
          >
            <Terminal className="h-3 w-3 text-emerald-400" />
            <span>API Catalog</span>
            <ExternalLink className="h-2.5 w-2.5 text-emerald-400/70" />
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-white/10 rounded-lg text-[11px] font-mono text-zinc-300 bg-white/[0.02]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">edge_active</span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Phone / Smartphone screens) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-50 bg-[#07090b] border-b border-white/10 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Navigation Menu
          </div>
          <div className="grid grid-cols-1 gap-1">
            <button
              onClick={() => {
                onToggleViewMode?.("landing");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-mono text-left bg-emerald-950/30 border border-emerald-500/30 text-white"
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
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-emerald-400 text-xs">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
