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
    <aside className="hidden md:flex w-64 border-r border-[#f97316]/15 bg-[#0e0e11]/95 flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#08080a] border border-[#f97316]/20 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-surface from-[#f97316] to-[#16161b] text-[#08080a] flex items-center justify-center font-mono text-xs font-bold shadow-md shadow-[#f97316]/20">
              M
            </div>
            <div>
              <div className="text-xs font-semibold text-[#f4f4f5] tracking-tight">Morvexa Server</div>
              <div className="text-[10px] font-mono text-[#a1a1aa]">owner_plane</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30 font-bold">
            MASTER
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold">
          Platform Controls
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
 isActive
 ? "bg-[#16161b]/40 text-[#f4f4f5] font-bold border border-[#f97316]/40 shadow-sm shadow-[#f97316]/10"
 : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]"
 }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 transition-colors ${
 isActive ? "text-[#f97316]" : "text-[#71717a]"
 }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="text-[#f97316] text-xs">●</span>}
            </button>
          );
        })}

        {onOpenExperience && (
          <div className="pt-4 mt-4 border-t border-white/5">
            <button
              onClick={onOpenExperience}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-[#a1a1aa] hover:text-[#f97316] hover:bg-[#f97316]/5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#f97316]" />
              <span>3D Showcase Scene</span>
            </button>
          </div>
        )}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/5 bg-[#08080a]/80">
        <div className="rounded-lg border border-white/5 bg-[#0e0e11] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="text-[#a1a1aa]">Upstream Mesh</span>
            <span className="text-[#f97316] text-[10px] font-semibold">6/6 healthy</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-[#71717a]">
            <div className="flex justify-between items-center">
              <span>Private Local (5002)</span>
              <span className="text-[#f97316] font-bold">8ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Anthropic Direct</span>
              <span className="text-[#a1a1aa]">142ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>DeepSeek V3</span>
              <span className="text-[#a1a1aa]">98ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Groq LPU</span>
              <span className="text-[#a1a1aa]">45ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
