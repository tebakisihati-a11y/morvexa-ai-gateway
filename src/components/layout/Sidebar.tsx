"use client";

import React from "react";
import {
  LayoutDashboard,
  KeyRound,
  GitBranch,
  PlaySquare,
  Activity,
  Shield,
  CreditCard,
  Server,
  Building2,
  Sparkles,
} from "lucide-react";

export type NavTabId =
  | "overview"
  | "customers"
  | "keys"
  | "billing"
  | "infrastructure"
  | "nexus"
  | "routing"
  | "playground"
  | "traces"
  | "guardrails";

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onOpenExperience?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onOpenExperience }: SidebarProps) {
  const navItems: { id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Command Center", icon: LayoutDashboard },
    { id: "customers", label: "Database Kustomer & Aktivitas", icon: Building2 },
    { id: "keys", label: "API Keys & Policies", icon: KeyRound },
    { id: "billing", label: "Billing & Subscriptions", icon: CreditCard },
    { id: "infrastructure", label: "Hybrid Infrastructure", icon: Server },
    { id: "nexus", label: "Nexus Control Plane", icon: Sparkles },
    { id: "routing", label: "Routing & Failover", icon: GitBranch },
    { id: "playground", label: "Live SSE Playground", icon: PlaySquare },
    { id: "traces", label: "Audit Traces & Logs", icon: Activity },
    { id: "guardrails", label: "Guardrails & Config", icon: Shield },
  ];

  return (
    <aside className="hidden md:flex w-64 border-r border-[#5B8DEF]/15 bg-[#080A14]/95 backdrop-blur-xl flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#06070F] border border-[#5B8DEF]/20 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#2A3576] text-[#06070F] flex items-center justify-center font-mono text-xs font-bold shadow-md shadow-[#5B8DEF]/20">
              M
            </div>
            <div>
              <div className="text-xs font-semibold text-[#E9EDFB] tracking-tight">Morvexa Server</div>
              <div className="text-[10px] font-mono text-[#8E97BC]">owner_plane</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5B8DEF]/10 text-[#5B8DEF] border border-[#5B8DEF]/30 font-bold">
            MASTER
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#8E97BC] font-semibold">
          Platform Controls
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                isActive
                  ? "bg-[#2A3576]/40 text-[#E9EDFB] font-bold border border-[#5B8DEF]/40 shadow-sm shadow-[#5B8DEF]/10"
                  : "text-zinc-400 hover:text-[#E9EDFB] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-[#5B8DEF]" : "text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="text-[#5B8DEF] text-xs">●</span>}
            </button>
          );
        })}

        {onOpenExperience && (
          <div className="pt-4 mt-4 border-t border-white/5">
            <button
              onClick={onOpenExperience}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-[#8E97BC] hover:text-[#5B8DEF] hover:bg-[#5B8DEF]/5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#5B8DEF]" />
              <span>3D Showcase Scene</span>
            </button>
          </div>
        )}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/5 bg-[#06070F]/80">
        <div className="rounded-xl border border-white/5 bg-[#080A14] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="text-[#8E97BC]">Upstream Mesh</span>
            <span className="text-[#5B8DEF] text-[10px] font-semibold">6/6 healthy</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>Private Local (5002)</span>
              <span className="text-[#5B8DEF] font-bold">8ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Anthropic Direct</span>
              <span className="text-zinc-400">142ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>DeepSeek V3</span>
              <span className="text-zinc-400">98ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Groq LPU</span>
              <span className="text-zinc-400">45ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
