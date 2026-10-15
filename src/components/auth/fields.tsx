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
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#f4f4f5]">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-[12.5px] text-[#ef4444]"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded border bg-[#08080a] px-3.5 py-3 text-sm text-[#f4f4f5] placeholder:text-[#71717a] transition-colors duration-150 outline-none";

function inputTone(hasError: boolean, valid: boolean) {
  if (hasError) return "border-[#ef4444]/55 focus:border-[#ef4444]";
  if (valid) return "border-[#10b981]/40 focus:border-[#10b981]/70";
  return "border-[#f4f4f5]/12 focus:border-[#f97316]";
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
    "bg-[#f4f4f5]/10",
    "bg-[#ef4444]",
    "bg-[#eab308]",
    "bg-[#f97316]",
    "bg-[#10b981]",
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
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-2 text-[#71717a] transition-colors hover:text-[#f4f4f5]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="flex items-center gap-2.5 pt-0.5">
          <div
            className="flex flex-1 gap-1"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strengthScore}
            aria-label={`Kekuatan password: ${strengthLabel}`}
          >
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
 strengthScore >= step ? meterTone[strengthScore] : "bg-[#f4f4f5]/10"
 }`}
              />
            ))}
          </div>
          <span className="w-20 text-right font-mono text-[11px] text-[#a1a1aa]">
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
      className="flex items-start gap-2.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/[0.08] px-3.5 py-3 text-[13px] leading-relaxed text-[#ef4444]"
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
      className="flex items-start gap-2.5 rounded-lg border border-[#10b981]/30 bg-[#10b981]/[0.08] px-3.5 py-3 text-[13px] leading-relaxed text-[#10b981]"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
