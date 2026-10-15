"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Coins, LogOut, User } from "lucide-react";
import { CustomerBentoPortal } from "@/components/customer/CustomerBentoPortal";
import { CustomerCheckoutModal } from "@/components/customer/CustomerCheckoutModal";
import { CustomerModelCheckoutModal } from "@/components/customer/CustomerModelCheckoutModal";
import { AmbientField } from "@/components/visual/AmbientField";
import { Button, Spinner } from "@/components/ui/primitives";
import { useSession } from "@/lib/hooks/useSession";
import { providerLabel } from "@/lib/validation/auth";
import type { ModelProduct } from "@/lib/customer/catalog";

interface IssuedKeyNotice {
  email: string;
  keySecret: string;
  title: string;
  /** False when no mail transport is configured; the copy then must not claim an email was sent. */
  emailDelivered: boolean;
}

export default function CustomerPortalPage() {
  const router = useRouter();
  const { loading, authenticated, user, signOut } = useSession();

  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<string | null>(null);
  const [selectedModelProduct, setSelectedModelProduct] = useState<ModelProduct | null>(null);
  const [issuedKey, setIssuedKey] = useState<IssuedKeyNotice | null>(null);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const handlePlanSettled = (result: any) => {
    if (result?.autoProvision) {
      setIssuedKey({
        email: result.autoProvision.emailSentTo,
        keySecret: result.autoProvision.rawSecret,
        title: `Paket ${result.autoProvision.apiKey.name} berhasil diterbitkan`,
        emailDelivered: Boolean(result.autoProvision.emailDelivered),
      });
    }
  };

  const handleModelPaymentSuccess = (result: any) => {
    if (result?.apiKey) {
      setIssuedKey({
        email: result.order.customerEmail,
        keySecret: result.apiKey.rawSecret,
        title: `Token ${result.order.productName} berhasil diterbitkan`,
        emailDelivered: Boolean(result.autoProvision?.emailDelivered),
      });
    }
  };

  // The session cookie is HttpOnly, so gate on the server probe rather than
  // localStorage. Signed-out visitors are sent to /login and returned here.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#06070f]">
        <div className="flex items-center gap-3 text-sm text-[#8e97bc]">
          <Spinner className="text-[#5b8def]" />
          Memeriksa sesi…
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return (
      <div className="grain relative grid min-h-screen place-items-center overflow-hidden bg-[#06070f] px-5">
        <AmbientField variant="hero" />
        <div className="panel relative z-10 w-full max-w-md rounded-2xl p-8 text-center">
          <h1 className="text-xl font-semibold text-[#e9edfb]">Sesi Anda sudah berakhir</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8e97bc]">
            Masuk kembali untuk melanjutkan ke portal kustomer.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button onClick={() => router.replace("/login?next=/customer")}>Masuk ke akun</Button>
            <Button variant="secondary" onClick={() => router.replace("/signup")}>
              Daftar akun baru
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="grain relative min-h-screen overflow-hidden bg-[#06070f]">
      <AmbientField variant="quiet" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-[#e9edfb]/8 bg-[#06070f]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-[12.5px] text-[#8e97bc] transition-colors hover:text-[#e9edfb]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Beranda</span>
              </Link>
              <span className="text-[#5a6390]">/</span>
              <span className="flex items-center gap-2 text-[13.5px] font-medium text-[#e9edfb]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5b8def]" />
                Portal Kustomer
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="text-right">
                  <div className="text-[12.5px] font-medium text-[#e9edfb]">{user.name}</div>
                  <div className="font-mono text-[10.5px] text-[#8e97bc]">{user.email}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#5b8def]/35 bg-[#5b8def]/12 font-mono text-[12px] font-bold text-[#9db9f5]">
                  {initials}
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout} title="Keluar dari akun">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {issuedKey && (
            <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-[#5b8def]/30 bg-[#5b8def]/[0.06] p-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#9db9f5]">
                  <CheckCircle2 className="h-4 w-4" />
                  {issuedKey.title}
                </div>
                <p className="text-sm text-[#e9edfb]">
                  {issuedKey.emailDelivered ? (
                    <>
                      API key dikirim ke{" "}
                      <span className="font-medium text-[#9db9f5]">{issuedKey.email}</span>
                    </>
                  ) : (
                    <>
                      API key diterbitkan untuk{" "}
                      <span className="font-medium text-[#9db9f5]">{issuedKey.email}</span>
                    </>
                  )}
                </p>
                <p className="text-[12.5px] text-[#8e97bc]">
                  {issuedKey.emailDelivered
                    ? "Kunci ini juga hanya ditampilkan sekali di sini. Simpan di secret manager Anda sekarang."
                    : "Pengiriman email belum aktif di lingkungan ini, jadi salin kunci dari sini. Kunci hanya ditampilkan sekali."}
                </p>
                <code className="block break-all rounded-lg border border-[#e9edfb]/10 bg-[#06070f] px-3 py-2 font-mono text-[12.5px] text-[#9db9f5]">
                  {issuedKey.keySecret}
                </code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIssuedKey(null)}
                className="shrink-0"
              >
                Tutup
              </Button>
            </div>
          )}

          <CustomerBentoPortal
            onOpenCheckoutModal={(plan) => setSelectedCheckoutPlan(plan)}
            onOpenModelCheckoutModal={(model) => setSelectedModelProduct(model)}
            activeCustomer={user}
            onOpenAuthModal={() => router.push("/login")}
          />
        </main>

        <footer className="border-t border-[#e9edfb]/8 py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 text-[11.5px] text-[#5a6390] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <span className="flex items-center gap-2 font-mono">
              <User className="h-3.5 w-3.5" />
              {providerLabel(user.provider)} · {user.currentPlan}
            </span>
            <span className="flex items-center gap-2 font-mono">
              <Coins className="h-3.5 w-3.5" />
              {user.tokenBalance.toLocaleString("id-ID")} token tersedia
            </span>
          </div>
        </footer>
      </div>

      <CustomerCheckoutModal
        planCode={selectedCheckoutPlan || "pro"}
        isOpen={Boolean(selectedCheckoutPlan)}
        onClose={() => setSelectedCheckoutPlan(null)}
        onPaymentSettled={handlePlanSettled}
      />

      <CustomerModelCheckoutModal
        product={selectedModelProduct}
        isOpen={Boolean(selectedModelProduct)}
        onClose={() => setSelectedModelProduct(null)}
        onSuccess={handleModelPaymentSuccess}
        defaultEmail={user.email}
        defaultName={user.name}
      />
    </div>
  );
}
