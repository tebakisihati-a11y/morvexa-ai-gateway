/**
 * FailoverTracePreview - static illustration of the request path.
 *
 * Replaces the AgentCore 3D orb. The brief bans decorative cartoon/3D
 * illustration and asks every pixel to carry measurable state, so the hero now
 * shows what the product actually does: a request entering the gateway, being
 * attempted against providers in priority order, one of them failing, and the
 * chain recovering. Values are illustrative and labelled as such - it is not
 * presented as live telemetry.
 */

import React, { useEffect, useState } from "react";

interface Hop {
  provider: string;
  model: string;
  latency: string;
  state: "ok" | "retry" | "skip";
}

const HOPS: Hop[] = [
  { provider: "anthropic", model: "claude-sonnet-4", latency: "412 ms", state: "ok" },
  { provider: "openai", model: "gpt-4o", latency: "429", state: "retry" },
  { provider: "deepseek", model: "deepseek-chat", latency: "—", state: "skip" },
];

const STATE_STYLES: Record<Hop["state"], string> = {
  ok: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
  retry: "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
  skip: "border-[#f4f4f5]/10 bg-[#f4f4f5]/5 text-[#71717a]",
};

const STATE_LABELS: Record<Hop["state"], string> = {
  ok: "200 OK",
  retry: "429 RETRY",
  skip: "STANDBY",
};

/* Milliseconds at which each hop becomes "current" as the request travels down
   the chain, then a settle step that clears the highlight. One pass only: brief
   section 1 bans looping decorative animation, and a request is not a loop. */
const TRAVEL_SCHEDULE_MS = [250, 900, 1550] as const;
const SETTLE_AT_MS = 2200;

export function FailoverTracePreview({ className = "" }: { className?: string }) {
  const [activeHop, setActiveHop] = useState<number>(-1);

  useEffect(() => {
    // Respect the OS setting: skip the travel entirely and render the final
    // state, which is the same picture with no motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers: ReturnType<typeof setTimeout>[] = TRAVEL_SCHEDULE_MS.map((delay, index) =>
      setTimeout(() => setActiveHop(index), delay)
    );
    timers.push(setTimeout(() => setActiveHop(-1), SETTLE_AT_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={`rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] hairline-top ${className}`}
    >
      {/* Request line */}
      <div className="flex items-center justify-between border-b border-[#f4f4f5]/8 px-4 py-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
          POST /v1/messages
        </span>
        <span className="font-mono text-[10px] text-[#71717a]">trace 7f3a</span>
      </div>

      {/* Provider chain */}
      <div className="divide-y divide-[#f4f4f5]/8">
        {HOPS.map((hop, index) => {
          const isActive = activeHop === index;
          return (
            <div
              key={hop.provider}
              data-active={isActive ? "true" : undefined}
              className={`relative flex items-center gap-3 px-4 py-3 transition-colors duration-300 ${
                isActive ? "bg-[#f97316]/6" : "bg-transparent"
              }`}
            >
              {/* Left accent bar that marks the hop currently being attempted. */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-0 h-full w-0.5 transition-opacity duration-300 ${
                  isActive ? "bg-[#f97316] opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  hop.state === "ok"
                    ? "bg-[#10b981]"
                    : hop.state === "retry"
                      ? "bg-[#ef4444]"
                      : "bg-[#71717a]"
                } ${isActive ? "ring-4 ring-[#f97316]/20" : ""}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px] text-[#f4f4f5]">{hop.provider}</p>
                <p className="truncate font-mono text-[10.5px] text-[#71717a]">{hop.model}</p>
              </div>
              <span className="font-mono text-[11px] text-[#a1a1aa]">{hop.latency}</span>
              <span
                className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-[0.05em] ${STATE_STYLES[hop.state]}`}
              >
                {STATE_LABELS[hop.state]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Outcome */}
      <div className="flex items-center justify-between border-t border-[#f4f4f5]/8 px-4 py-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
          Terjawab oleh
        </span>
        <span className="font-mono text-[11px] text-[#f97316]">anthropic · hop 1</span>
      </div>
    </div>
  );
}
