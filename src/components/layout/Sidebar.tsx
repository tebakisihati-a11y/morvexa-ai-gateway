"use client";

import React from "react";
import {
  LayoutDashboard,
  KeyRound,
  GitBranch,
  PlaySquare,
  Activity,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";

export type NavTabId = "overview" | "keys" | "routing" | "playground" | "traces" | "guardrails";

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: { id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: "overview", label: "Command Center", icon: LayoutDashboard },
    { id: "keys", label: "API Keys & Policies", icon: KeyRound },
    { id: "routing", label: "Model Routing & Failover", icon: GitBranch },
    { id: "playground", label: "SSE Playground", icon: PlaySquare, badge: "Live" },
    { id: "traces", label: "Live Traces & Logs", icon: Activity },
    { id: "guardrails", label: "Guardrails & Deploy", icon: Shield },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0c0c0e] flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono text-xs font-bold border border-orange-500/30">
              M
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-200">Morvexa Core Org</div>
              <div className="text-[10px] font-mono text-zinc-500">org_mvx_prod</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PRO
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Platform
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-orange-400" : "text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-zinc-400 font-medium">Upstream Mesh</span>
            <span className="text-emerald-400 font-mono text-[10px]">5/5 Online</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-zinc-500">
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
