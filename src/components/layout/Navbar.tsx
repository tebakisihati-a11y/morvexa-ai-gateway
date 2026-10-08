"use client";

import React, { useState } from "react";
import { EdgeStatusRadar } from "./EdgeStatusRadar";
import { Cpu, Terminal, ExternalLink, Menu, X } from "lucide-react";
import type { NavTabId } from "./Sidebar";

interface NavbarProps {
  currentTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export function Navbar({ currentTab, onTabChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTabId; label: string }[] = [
    { id: "overview", label: "Overview & Quota" },
    { id: "keys", label: "API Keys & Policies" },
    { id: "routing", label: "Model Routing & Failover" },
    { id: "playground", label: "Streaming Playground" },
    { id: "traces", label: "Live Traces & Logs" },
    { id: "guardrails", label: "Guardrails & Deploy" },
  ];

  const handleSelectTab = (tab: NavTabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 border-b border-white/10 bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded border border-white/10 text-zinc-400 hover:text-white bg-white/5 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-orange-600 flex items-center justify-center font-mono font-bold text-xs text-white shadow-sm">
              M
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-semibold tracking-tight text-sm text-zinc-100">
                Morvexa
              </span>
              <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline">
                / ai-gateway
              </span>
            </div>
          </div>
        </div>

        {/* Global Telemetry & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <EdgeStatusRadar />

          <a
            href="/api/v1/models"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-white/10 px-2.5 py-1 rounded transition-colors bg-black/40"
          >
            <Terminal className="h-3 w-3 text-zinc-400" />
            <span>API Catalog</span>
            <ExternalLink className="h-2.5 w-2.5 text-zinc-500" />
          </a>

          <div className="flex items-center gap-1 px-2 py-0.5 border border-white/10 rounded text-[11px] font-mono text-zinc-400 bg-white/[0.02]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">free_tier</span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Phone / Smartphone screens) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-50 bg-[#0c0c0e] border-b border-white/10 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2">
            Navigation Menu
          </div>
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
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
                  {isActive && <span className="text-orange-400 text-xs">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
