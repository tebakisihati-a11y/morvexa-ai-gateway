"use client";

import React from "react";
import {
  LayoutDashboard,
  KeyRound,
  GitBranch,
  PlaySquare,
  Activity,
  Shield,
  Server,
  Building2,
  Sparkles,
  Zap,
  Stethoscope,
} from "lucide-react";

export type NavTabId =
  | "overview"
  | "provisioning"
  | "resolver"
  | "customers"
  | "keys"
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

interface NavSection {
  title: string;
  items: {
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export function Sidebar({ activeTab, onTabChange, onOpenExperience }: SidebarProps) {
  const sections: NavSection[] = [
    {
      title: "OPERASI SISTEM",
      items: [
        { id: "overview", label: "Command Center", icon: LayoutDashboard },
        { id: "provisioning", label: "Key Provisioning & Auto", icon: Zap, badge: "AUTO" },
        { id: "resolver", label: "Customer Doctor & Triage", icon: Stethoscope, badge: "DOCTOR" },
      ],
    },
    {
      title: "TENANT & ACCESS",
      items: [
        { id: "customers", label: "Database Kustomer & Aktivitas", icon: Building2 },
        { id: "keys", label: "API Keys & Policies", icon: KeyRound },
      ],
    },
    {
      title: "INFRASTRUKTUR",
      items: [
        { id: "routing", label: "Routing & Failover Mesh", icon: GitBranch },
        { id: "infrastructure", label: "Hybrid Infrastructure", icon: Server },
        { id: "nexus", label: "Nexus Control Plane", icon: Sparkles },
      ],
    },
    {
      title: "OBSERVABILITY & POLICY",
      items: [
        { id: "playground", label: "Live SSE Playground", icon: PlaySquare },
        { id: "traces", label: "Audit Traces & Logs", icon: Activity },
        { id: "guardrails", label: "Guardrails & Config", icon: Shield },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-64 border-r border-white/[0.08] bg-[#07090b]/95 backdrop-blur-xl flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0e12] border border-white/[0.08] shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-700 text-black flex items-center justify-center font-mono text-xs font-bold shadow-sm shadow-emerald-500/20">
              M
            </div>
            <div>
              <div className="text-xs font-semibold text-[#f4f4f5] tracking-tight">Morvexa Server</div>
              <div className="text-[10px] font-mono text-[#a1a1aa]">master_control_plane</div>
            </div>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold tracking-wider">
            OWNER
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2.5 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 font-semibold">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/[0.06] text-white font-semibold border border-white/10 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        isActive ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {item.badge && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <span className="text-emerald-400 text-xs">●</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {onOpenExperience && (
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={onOpenExperience}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>3D Showcase Scene</span>
            </button>
          </div>
        )}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/5 bg-black/40">
        <div className="rounded-lg border border-white/5 bg-[#0b0e12] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="text-[#a1a1aa]">Upstream Mesh</span>
            <span className="text-emerald-400 text-[10px] font-semibold">5/5 healthy</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>Local Mesh (5002)</span>
              <span className="text-emerald-400 font-bold">8ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Claude 3.7 Direct</span>
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
