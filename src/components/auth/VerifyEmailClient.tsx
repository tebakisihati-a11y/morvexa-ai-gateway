"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, MailCheck, RefreshCw } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { TextField, FormError, FormSuccess } from "./fields";
import { Button, Spinner } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api/client";

const HIGHLIGHTS = [
  {
    title: "Kenapa harus verifikasi",
    body: "Verifikasi memastikan API key dan tautan reset password hanya terkirim ke alamat yang benar-benar Anda kuasai.",
  },
  {
    title: "Tidak menemukan emailnya",
    body: "Periksa folder spam atau promosi. Kalau tetap tidak ada, kirim ulang tautannya dari halaman ini.",
  },
];

type Phase = "checking" | "awaiting" | "verified" | "failed";

/**
 * Single page for both ends of the verification flow.
 *
 * With ?token= it redeems the link. Without a token it is the "check your inbox"
 * screen shown right after signup, with a resend control. Keeping both here means
 * the post-signup screen and the dead-link screen stay consistent.
 */
export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") ?? "";
  const deliveryFailed = searchParams.get("delivery") === "failed";

  const [phase, setPhase] = useState<Phase>(token ? "checking" : "awaiting");
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Redeem the token once on mount. The endpoint is idempotent, so a refresh
  // after success reports "already verified" instead of failing.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await apiFetch("/api/customer/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok) {
          setPhase("verified");
          if (data.email) setEmail(data.email);
        } else {
          setPhase("failed");
          setError(data.error || "Tautan verifikasi tidak bisa dipakai.");
        }
      } catch {
        if (!cancelled) {
          setPhase("failed");
          setError("Koneksi ke server gagal. Periksa jaringan Anda lalu muat ulang halaman.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = useCallback(async () => {
    setError(null);
    setMessage(null);
    setEmailError(null);

    if (!email.trim()) {
      setEmailError("Masukkan email yang Anda pakai saat mendaftar.");
      return;
    }

    setResending(true);
    try {
      const response = await apiFetch("/api/customer/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Gagal mengirim ulang tautan. Coba lagi sebentar lagi.");
        return;
      }

      // The endpoint answers identically for every address, so the copy must not
      // promise that a mail was sent to this particular inbox.
      setMessage(
        "Kalau akun tersebut ada dan belum terverifikasi, tautan baru sudah kami kirim. Periksa kotak masuk dan folder spam."
      );
      setPhase("awaiting");
    } catch {
      setError("Koneksi ke server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setResending(false);
    }
  }, [email]);

  return (
    <AuthShell
      title={phase === "verified" ? "Email terverifikasi" : "Verifikasi email Anda"}
      subtitle={
        phase === "verified"
          ? "Akun Anda sudah aktif sepenuhnya. Sekarang Anda bisa masuk dan mulai memakai gateway."
          : "Satu langkah singkat sebelum akun Morvexa Anda aktif sepenuhnya."
      }
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-[13.5px] text-[#a1a1aa]">
          {phase === "verified" ? (
            <>
              Siap mulai?{" "}
              <Link
                href="/customer"
                className="font-medium text-[#fdba74] underline-offset-4 transition-colors hover:text-[#f4f4f5] hover:underline"
              >
                Buka portal pelanggan
              </Link>
            </>
          ) : (
            <>
              Sudah terverifikasi?{" "}
              <Link
                href="/login"
                className="font-medium text-[#fdba74] underline-offset-4 transition-colors hover:text-[#f4f4f5] hover:underline"
              >
                Masuk di sini
              </Link>
            </>
          )}
        </p>
      }
    >
      {phase === "checking" && (
        <div className="flex items-center gap-3 rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11]/70 px-4 py-3.5">
          <Spinner className="h-4 w-4 text-[#f97316]" />
          <p className="text-[13.5px] text-[#a1a1aa]">Memeriksa tautan verifikasi…</p>
        </div>
      )}

      {phase === "verified" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-[#10b981]/25 bg-[#10b981]/8 px-4 py-3.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10b981]" />
            <div>
              <p className="text-[13.5px] font-medium text-[#f4f4f5]">
                {email ? `${email} sudah terverifikasi.` : "Email Anda sudah terverifikasi."}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#a1a1aa]">
                API key akan dikirim ke alamat ini setelah pembayaran paket Anda dikonfirmasi.
              </p>
            </div>
          </div>

          <Link
            href="/customer"
            className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-lg bg-[#f97316] px-7 text-[15px] font-semibold text-[#08080a] transition-[background-color,box-shadow] duration-200 hover:bg-[#fb923c]"
          >
            Buka portal pelanggan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {phase === "failed" && (
        <div className="space-y-4">
          <FormError>{error}</FormError>
          <p className="text-[13px] leading-relaxed text-[#a1a1aa]">
            Tautan verifikasi berlaku terbatas dan hanya bisa dipakai sekali. Masukkan email Anda
            untuk mendapat tautan baru.
          </p>
          <ResendBlock
            email={email}
            emailError={emailError}
            setEmail={setEmail}
            message={message}
            error={error}
            resending={resending}
            onResend={handleResend}
          />
        </div>
      )}

      {phase === "awaiting" && (
        <div className="space-y-4">
          {deliveryFailed && !message && (
            <div className="rounded-lg border border-[#eab308]/25 bg-[#eab308]/8 px-4 py-3.5">
              <p className="text-[13px] leading-relaxed text-[#f4f4f5]">
                Akun Anda sudah dibuat, tetapi email verifikasi belum berhasil terkirim dari server
                kami. Gunakan tombol di bawah untuk mencoba lagi.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11]/70 px-4 py-3.5">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
            <p className="text-[13px] leading-relaxed text-[#a1a1aa]">
              Kami mengirim tautan verifikasi
              {initialEmail ? (
                <>
                  {" "}
                  ke <span className="font-medium text-[#f4f4f5]">{initialEmail}</span>
                </>
              ) : (
                " ke email pendaftaran Anda"
              )}
              . Klik tautan di email tersebut untuk mengaktifkan akun.
            </p>
          </div>

          {message && <FormSuccess>{message}</FormSuccess>}

          <ResendBlock
            email={email}
            emailError={emailError}
            setEmail={setEmail}
            message={message}
            error={error}
            resending={resending}
            onResend={handleResend}
          />
        </div>
      )}
    </AuthShell>
  );
}

function ResendBlock({
  email,
  emailError,
  setEmail,
  message,
  error,
  resending,
  onResend,
}: {
  email: string;
  emailError: string | null;
  setEmail: (value: string) => void;
  message: string | null;
  error: string | null;
  resending: boolean;
  onResend: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-[#f4f4f5]/8 pt-5">
      <TextField
        label="Kirim ulang tautan verifikasi"
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

      {message && !emailError && <FormSuccess>{message}</FormSuccess>}
      {error && !emailError && <FormError>{error}</FormError>}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={resending}
        onClick={onResend}
        className="w-full"
      >
        {!resending && <RefreshCw className="h-4 w-4" />}
        {resending ? "Mengirim…" : "Kirim ulang tautan"}
      </Button>
    </div>
  );
}
