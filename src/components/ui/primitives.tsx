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
    "bg-[#5b8def] text-[#04050c] font-semibold shadow-[0_10px_34px_-12px_rgba(91,141,239,0.85)] hover:bg-[#6f9bf3] active:bg-[#4f80e2]",
  secondary:
    "border border-[#e9edfb]/15 bg-[#e9edfb]/[0.04] text-[#e9edfb] hover:bg-[#e9edfb]/[0.08] hover:border-[#e9edfb]/25",
  ghost: "text-[#8e97bc] hover:text-[#e9edfb] hover:bg-[#e9edfb]/[0.06]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-[52px] px-7 text-[15px] rounded-xl gap-2.5",
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
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#8e97bc] ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-[#5b8def]" />
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
  return <Tag className={`panel rounded-2xl ${className}`}>{children}</Tag>;
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
    neutral: "border-[#e9edfb]/12 bg-[#e9edfb]/[0.05] text-[#8e97bc]",
    accent: "border-[#5b8def]/30 bg-[#5b8def]/12 text-[#9db9f5]",
    positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
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
