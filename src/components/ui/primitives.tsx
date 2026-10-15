"use client";

import React from "react";

/* ---------------------------------------------------------------------------
   Shared UI primitives.
   Centralised so buttons, panels and eyebrow labels stay visually identical
   across the landing page, the auth screens and the customer portal.
   ------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#f97316] text-[#08080a] font-semibold  hover:bg-[#fb923c] active:bg-[#ea580c]",
  secondary:
    "border border-[#f4f4f5]/15 bg-[#f4f4f5]/[0.04] text-[#f4f4f5] hover:bg-[#f4f4f5]/[0.08] hover:border-[#f4f4f5]/25",
  ghost: "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#f4f4f5]/[0.06]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-lg gap-2",
  lg: "h-[52px] px-7 text-[15px] rounded-lg gap-2.5",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,box-shadow,color] duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Small uppercase label used above section headings. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#a1a1aa] ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-[#f97316]" />
      {children}
    </span>
  );
}

/** Rounded container used for all content blocks. */
export function Panel({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return <Tag className={`panel rounded-lg ${className}`}>{children}</Tag>;
}

/** Inline status pill. */
export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "positive" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "border-[#f4f4f5]/12 bg-[#f4f4f5]/[0.05] text-[#a1a1aa]",
    accent: "border-[#f97316]/30 bg-[#f97316]/12 text-[#fdba74]",
    positive: "border-[#10b981]/25 bg-[#10b981]/10 text-[#10b981]",
    warning: "border-[#eab308]/25 bg-[#eab308]/10 text-[#eab308]",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Section wrapper providing consistent vertical rhythm and max width. */
export function Section({
  id,
  children,
  className = "",
  width = "wide",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) {
  return (
    <section
      id={id}
      className={`relative mx-auto w-full px-5 sm:px-8 ${
 width === "wide" ? "max-w-6xl" : "max-w-3xl"
 } ${className}`}
    >
      {children}
    </section>
  );
}
