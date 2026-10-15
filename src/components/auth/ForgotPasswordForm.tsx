"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { TextField, FormError } from "./fields";
import { Button } from "@/components/ui/primitives";
import { validateEmail } from "@/lib/validation/auth";

const HIGHLIGHTS = [
  {
    title: "Tautan sekali pakai",
    body: "Tautan reset hanya berlaku 30 menit dan langsung tidak berlaku setelah dipakai.",
  },
  {
    title: "Password lama tetap aman",
    body: "Kami tidak pernah mengirim password Anda lewat email. Anda sendiri yang menentukan password baru.",
  },
  {
    title: "Percobaan dibatasi",
    body: "Permintaan reset dibatasi per alamat email, supaya email orang lain tidak bisa dibanjiri pesan.",
  },
];

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailError = email.length > 0 ? validateEmail(email) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const firstError = validateEmail(email);
    if (firstError) {
      setFormError(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Permintaan gagal diproses. Silakan coba lagi.");
        return;
      }

      setSentTo(email.trim());
    } catch {
      setFormError("Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Lupa password"
      subtitle="Masukkan email akun Morvexa Anda. Kami akan mengirim tautan untuk membuat password baru."
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-[13.5px] text-[#8e97bc]">
          Ingat password Anda?{" "}
          <Link
            href="/login"
            className="font-medium text-[#9db9f5] underline-offset-4 transition-colors hover:text-[#e9edfb] hover:underline"
          >
            Kembali ke halaman masuk
          </Link>
        </p>
      }
    >
      {sentTo ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-[#5b8def]/30 bg-[#5b8def]/[0.07] px-4 py-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#9db9f5]" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="text-[14px] font-medium text-[#e9edfb]">Periksa kotak masuk Anda</p>
              <p className="text-[13px] leading-relaxed text-[#8e97bc]">
                Jika <span className="font-medium text-[#c3c9e0]">{sentTo}</span> terdaftar,
                tautan reset sudah kami kirim ke alamat itu. Tautan berlaku 30 menit.
              </p>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-[#5a6390]">
            Tidak menerima email? Periksa folder spam atau promosi, lalu coba lagi dengan alamat
            yang benar.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setSentTo(null)}
          >
            Kirim ulang ke email lain
          </Button>
        </div>
      ) : (
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
            valid={Boolean(email) && !emailError}
            autoFocus
          />

          {formError && <FormError>{formError}</FormError>}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? "Mengirim tautan…" : "Kirim tautan reset"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
