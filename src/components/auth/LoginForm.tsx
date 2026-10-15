"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { PasswordField, TextField, FormError } from "./fields";
import { Button } from "@/components/ui/primitives";
import { validateEmail, safeRedirectPath } from "@/lib/validation/auth";

const HIGHLIGHTS = [
  {
    title: "Satu endpoint untuk semua model",
    body: "Anthropic, OpenAI, DeepSeek dan Gemini diakses lewat satu API key dengan format request yang sama.",
  },
  {
    title: "Failover otomatis",
    body: "Jika satu provider menolak atau melambat, permintaan dialihkan ke provider cadangan tanpa mengubah kode Anda.",
  },
  {
    title: "Kuota per tenant",
    body: "Pemakaian token dan rate limit dicatat per organisasi, lengkap dengan riwayat audit.",
  },
];

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailError = validateEmail(email);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (emailError) {
      setFormError(emailError);
      return;
    }
    if (!password) {
      setFormError("Password wajib diisi.");
      return;
    }

    // Read `next` here rather than through useSearchParams: that hook forces the
    // whole page into client-side rendering, which left /login with an empty
    // black first paint while /signup rendered its form immediately. The value
    // is validated below, so an attacker-supplied target cannot leave the site.
    const nextPath = safeRedirectPath(
      new URLSearchParams(window.location.search).get("next")
    );

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Tidak dapat masuk. Silakan coba lagi.");
        return;
      }

      // Full navigation so the portal re-reads the new session cookie.
      router.replace(nextPath);
      router.refresh();
    } catch {
      setFormError("Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Masuk ke akun Anda"
      subtitle="Gunakan email dan password yang Anda daftarkan untuk membuka portal kustomer Morvexa."
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-[13.5px] text-[#8e97bc]">
          Belum punya akun?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#9db9f5] underline-offset-4 transition-colors hover:text-[#e9edfb] hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} method="post" className="space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@perusahaan.com"
          value={email}
          onValueChange={setEmail}
          error={emailError}
          valid={!emailError}
          autoFocus
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Masukkan password Anda"
          value={password}
          onValueChange={setPassword}
          valid={password.length >= 8}
          hint={
            <Link
              href="/forgot-password"
              className="text-[12px] text-[#8e97bc] underline-offset-4 transition-colors hover:text-[#9db9f5] hover:underline"
            >
              Lupa password?
            </Link>
          }
        />

        {formError && <FormError>{formError}</FormError>}

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? "Memverifikasi…" : "Masuk"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthShell>
  );
}
