"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { PasswordField, FormError, FormSuccess } from "./fields";
import { Button } from "@/components/ui/primitives";
import { scorePassword, validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

const HIGHLIGHTS = [
  {
    title: "Password baru, sesi lama tetap",
    body: "Setelah password diganti, Anda langsung masuk ke portal tanpa perlu login ulang.",
  },
  {
    title: "Hash scrypt bersalt",
    body: "Password baru disimpan sebagai hash scrypt. Tidak ada plaintext yang tersimpan di server.",
  },
  {
    title: "Gunakan password yang unik",
    body: "Jangan pakai ulang password dari layanan lain. Password manager adalah cara paling aman.",
  },
];

export function ResetPasswordForm() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Read the token on the client so the page stays prerenderable: a
  // useSearchParams hook here would leave the route with an empty first paint.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const passwordError = password.length > 0 ? validatePassword(password) : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Konfirmasi password tidak sama."
      : null;

  const strength = useMemo(() => scorePassword(password), [password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const firstError =
      validatePassword(password) ||
      (confirmPassword !== password ? "Konfirmasi password tidak sama." : null);

    if (firstError) {
      setFormError(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Password gagal diperbarui. Silakan minta tautan baru.");
        return;
      }

      setDone(true);
      // The endpoint signs the customer in, so a short pause then straight to
      // the portal reads better than making them log in again.
      setTimeout(() => {
        router.replace("/customer");
        router.refresh();
      }, 1200);
    } catch {
      setFormError("Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // `token` is null until the effect runs, which avoids flashing the "invalid
  // link" state during the first paint.
  const missingToken = token === "";

  return (
    <AuthShell
      title="Atur password baru"
      subtitle="Buat password baru untuk akun Morvexa Anda. Setelah tersimpan, Anda langsung masuk ke portal."
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-[13.5px] text-[#a1a1aa]">
          Tautan sudah kedaluwarsa?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-[#fdba74] underline-offset-4 transition-colors hover:text-[#f4f4f5] hover:underline"
          >
            Minta tautan baru
          </Link>
        </p>
      }
    >
      {done ? (
        <FormSuccess>Password berhasil diperbarui. Mengalihkan Anda ke portal…</FormSuccess>
      ) : missingToken ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-[#eab308]/30 bg-[#eab308]/[0.08] px-3.5 py-3 text-[13px] leading-relaxed text-[#eab308]"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Tautan ini tidak memuat token reset. Pastikan Anda membuka alamat lengkap dari email
              Morvexa.
            </span>
          </div>
          <Button type="button" size="lg" className="w-full" onClick={() => router.push("/forgot-password")}>
            Minta tautan reset baru
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} method="post" className="space-y-4" noValidate>
          <PasswordField
            label="Password baru"
            name="password"
            autoComplete="new-password"
            placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter, huruf dan angka`}
            value={password}
            onValueChange={setPassword}
            error={passwordError}
            valid={Boolean(password) && !passwordError}
            showStrength
            strengthScore={strength.score}
            strengthLabel={strength.label}
            autoFocus
          />

          <PasswordField
            label="Konfirmasi password baru"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            error={confirmError}
            valid={Boolean(confirmPassword) && !confirmError}
          />

          {formError && <FormError>{formError}</FormError>}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? "Menyimpan…" : "Simpan password baru"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
