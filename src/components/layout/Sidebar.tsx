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
    { id: "keys", label: "API Keys & Policies", icon: KeyRound },
    { id: "billing", label: "Billing & Subscriptions", icon: CreditCard },
    { id: "infrastructure", label: "Hybrid Infrastructure", icon: Server },
    { id: "nexus", label: "Nexus Control Plane", icon: Building2 },
    { id: "routing", label: "Routing & Failover", icon: GitBranch },
    { id: "playground", label: "Live SSE Playground", icon: PlaySquare },
    { id: "traces", label: "Audit Traces & Logs", icon: Activity },
    { id: "guardrails", label: "Guardrails & Config", icon: Shield },
  ];

  return (
    <aside className="hidden md:flex w-60 border-r border-white/10 bg-[#06040d]/95 flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[#c03fb5] to-[#5449ab] text-white flex items-center justify-center font-mono text-[10px] font-bold">
              M
            </div>
            <div>
              <div className="text-xs font-medium text-[#f7f8fd]">Morvexa Gateway</div>
              <div className="text-[10px] font-mono text-[#aca3e1]/60">core_prod</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#c03fb5]/10 text-[#aca3e1] border border-[#c03fb5]/30">
            PRO
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#aca3e1]/70 font-semibold">
          Platform Controls
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#1a0b2e] text-white font-semibold border border-[#c03fb5]/40 shadow-sm shadow-purple-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-[#c03fb5]" : "text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="text-[#c03fb5] text-xs">●</span>}
            </button>
          );
        })}

        {onOpenExperience && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              onClick={onOpenExperience}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-mono text-[#aca3e1] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#c03fb5]" />
              <span>3D Showcase Scene</span>
            </button>
          </div>
        )}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/10 bg-[#030108]">
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="text-[#aca3e1]">Upstream Mesh</span>
            <span className="text-emerald-400 text-[10px]">6/6 healthy</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>Private Local (5002)</span>
              <span className="text-purple-300 font-bold">8ms</span>
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
