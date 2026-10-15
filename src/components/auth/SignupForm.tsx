"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { PasswordField, TextField, FormError } from "./fields";
import { Button } from "@/components/ui/primitives";
import {
  scorePassword,
  validateEmail,
  validateName,
  validatePassword,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation/auth";

const HIGHLIGHTS = [
  {
    title: "Mulai dari paket gratis",
    body: "Akun baru langsung mendapat kuota sandbox untuk menguji endpoint tanpa mengisi kartu kredit.",
  },
  {
    title: "Verifikasi email lebih dulu",
    body: "Kami mengirim satu tautan verifikasi saat Anda mendaftar. Ini memastikan API key nanti hanya terkirim ke alamat yang benar-benar Anda miliki.",
  },
  {
    title: "Key otomatis setelah pembayaran",
    body: "Begitu pembayaran paket atau paket token model dikonfirmasi, API key dibuat otomatis, dikirim ke email Anda, dan langsung tampil di portal.",
  },
  {
    title: "Tanpa penyimpanan plaintext",
    body: "Password disimpan sebagai hash scrypt bersalt, dan secret API tidak pernah disimpan dalam bentuk terbaca.",
  },
];

export function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameError = name.length > 0 ? validateName(name) : null;
  const emailError = email.length > 0 ? validateEmail(email) : null;
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
      validateName(name) ||
      validateEmail(email) ||
      validatePassword(password) ||
      (confirmPassword !== password ? "Konfirmasi password tidak sama." : null);

    if (firstError) {
      setFormError(firstError);
      return;
    }
    if (!acceptedTerms) {
      setFormError("Anda perlu menyetujui ketentuan layanan untuk melanjutkan.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Pendaftaran gagal. Silakan coba lagi.");
        return;
      }

      // Send the customer straight to the verification step, which explains
      // what to do when the mail has not arrived. The account already exists,
      // so abandoning this page is recoverable via the resend button there.
      const query = new URLSearchParams({ email: email.trim() });
      if (data.emailDelivered === false) query.set("delivery", "failed");
      router.replace(`/verify-email?${query.toString()}`);
      router.refresh();
    } catch {
      setFormError("Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Buat akun Morvexa"
      subtitle="Satu akun untuk mengelola API key, kuota, dan tagihan seluruh model AI Anda."
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-[13.5px] text-[#8e97bc]">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-[#9db9f5] underline-offset-4 transition-colors hover:text-[#e9edfb] hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} method="post" className="space-y-4" noValidate>
        <TextField
          label="Nama lengkap"
          name="name"
          autoComplete="name"
          placeholder="Nama Anda"
          value={name}
          onValueChange={setName}
          error={nameError}
          valid={Boolean(name) && !nameError}
          autoFocus
        />

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
          valid={Boolean(email) && !emailError}
        />

        <PasswordField
          label="Password"
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
        />

        <PasswordField
          label="Konfirmasi password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Ulangi password"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          error={confirmError}
          valid={Boolean(confirmPassword) && !confirmError}
        />

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[12.5px] leading-relaxed text-[#8e97bc]">
          <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#e9edfb]/20 bg-[#06070f] transition-colors checked:border-[#5b8def] checked:bg-[#5b8def]"
            />
            <Check
              className="pointer-events-none absolute h-3 w-3 text-[#04050c] opacity-0 transition-opacity peer-checked:opacity-100"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>
          <span>
            Saya menyetujui ketentuan layanan dan kebijakan privasi Morvexa, termasuk pemrosesan
            data pemakaian untuk penagihan.
          </span>
        </label>

        {formError && <FormError>{formError}</FormError>}

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? "Membuat akun…" : "Daftar akun"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthShell>
  );
}
