"use client";

import React, { useId, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

/* ---------------------------------------------------------------------------
   Form field primitives.
   Each field owns its own touched/visible state so error copy only appears
   after the user has actually interacted with it.
   ------------------------------------------------------------------------- */

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}

function FieldShell({ label, htmlFor, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#e9edfb]">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-[12.5px] text-rose-300"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border bg-[#06070f] px-3.5 py-3 text-sm text-[#e9edfb] placeholder:text-[#5a6390] transition-colors duration-150 outline-none";

function inputTone(hasError: boolean, valid: boolean) {
  if (hasError) return "border-rose-400/55 focus:border-rose-400";
  if (valid) return "border-emerald-400/40 focus:border-emerald-400/70";
  return "border-[#e9edfb]/12 focus:border-[#5b8def]";
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Validation message, shown only after the field has been blurred. */
  error?: string | null;
  hint?: React.ReactNode;
  valid?: boolean;
}

export function TextField({
  label,
  value,
  onValueChange,
  error,
  hint,
  valid = false,
  id,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [touched, setTouched] = useState(false);

  const showError = touched && error;

  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={showError ? error : null}>
      <input
        {...rest}
        id={fieldId}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? `${fieldId}-error` : undefined}
        className={`${inputBase} ${inputTone(Boolean(showError), touched && valid)}`}
      />
    </FieldShell>
  );
}

interface PasswordFieldProps extends Omit<TextFieldProps, "type" | "hint"> {
  /** Renders a strength meter under the field (signup only). */
  showStrength?: boolean;
  strengthScore?: 0 | 1 | 2 | 3 | 4;
  strengthLabel?: string;
  hint?: React.ReactNode;
}

export function PasswordField({
  label,
  value,
  onValueChange,
  error,
  hint,
  valid = false,
  showStrength = false,
  strengthScore = 0,
  strengthLabel = "",
  id,
  ...rest
}: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(false);

  const showError = touched && error;

  // The meter reflects how many rules are satisfied rather than a vague gradient.
  const meterTone = [
    "bg-[#e9edfb]/10",
    "bg-rose-400",
    "bg-amber-400",
    "bg-[#5b8def]",
    "bg-emerald-400",
  ];

  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={showError ? error : null}>
      <div className="relative">
        <input
          {...rest}
          id={fieldId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? `${fieldId}-error` : undefined}
          className={`${inputBase} pr-11 ${inputTone(Boolean(showError), touched && valid)}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#5a6390] transition-colors hover:text-[#e9edfb]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="flex items-center gap-2.5 pt-0.5">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  strengthScore >= step ? meterTone[strengthScore] : "bg-[#e9edfb]/10"
                }`}
              />
            ))}
          </div>
          <span className="w-20 text-right font-mono text-[11px] text-[#8e97bc]">
            {strengthLabel}
          </span>
        </div>
      )}
    </FieldShell>
  );
}

/* ---------------------------------------------------------------------------
   Feedback banners
   ------------------------------------------------------------------------- */

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3.5 py-3 text-[13px] leading-relaxed text-rose-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-3.5 py-3 text-[13px] leading-relaxed text-emerald-200"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
