"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Coins, LogOut, User } from "lucide-react";
import { CustomerBentoPortal } from "@/components/customer/CustomerBentoPortal";
import { CustomerApiKeys } from "@/components/customer/CustomerApiKeys";
import { CustomerCheckoutModal } from "@/components/customer/CustomerCheckoutModal";
import { CustomerModelCheckoutModal } from "@/components/customer/CustomerModelCheckoutModal";
import { GridBackdrop } from "@/components/visual/GridBackdrop";
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
      <div className="grid min-h-screen place-items-center bg-[#08080a]">
        <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
          <Spinner className="text-[#f97316]" />
          Memeriksa sesi…
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#08080a] px-5">
        <GridBackdrop />
        <div className="panel relative z-10 w-full max-w-md rounded-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-[#f4f4f5]">Sesi Anda sudah berakhir</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">
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
    <div className="relative min-h-screen overflow-hidden bg-[#08080a]">
      <GridBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-[#f4f4f5]/8 bg-[#08080a]/85">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-[12.5px] text-[#a1a1aa] transition-colors hover:text-[#f4f4f5]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Beranda</span>
              </Link>
              <span className="text-[#71717a]">/</span>
              <span className="flex items-center gap-2 text-[13.5px] font-medium text-[#f4f4f5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                Portal Kustomer
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="text-right">
                  <div className="text-[12.5px] font-medium text-[#f4f4f5]">{user.name}</div>
                  <div className="font-mono text-[10.5px] text-[#a1a1aa]">{user.email}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#f97316]/35 bg-[#f97316]/12 font-mono text-[12px] font-bold text-[#fdba74]">
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
            <div className="mb-8 flex flex-col gap-5 rounded-lg border border-[#f97316]/30 bg-[#f97316]/[0.06] p-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#fdba74]">
                  <CheckCircle2 className="h-4 w-4" />
                  {issuedKey.title}
                </div>
                <p className="text-sm text-[#f4f4f5]">
                  {issuedKey.emailDelivered ? (
                    <>
                      API key dikirim ke{" "}
                      <span className="font-medium text-[#fdba74]">{issuedKey.email}</span>
                    </>
                  ) : (
                    <>
                      API key diterbitkan untuk{" "}
                      <span className="font-medium text-[#fdba74]">{issuedKey.email}</span>
                    </>
                  )}
                </p>
                <p className="text-[12.5px] text-[#a1a1aa]">
                  {issuedKey.emailDelivered
                    ? "Kunci ini juga hanya ditampilkan sekali di sini. Simpan di secret manager Anda sekarang."
                    : "Pengiriman email belum aktif di lingkungan ini, jadi salin kunci dari sini. Kunci hanya ditampilkan sekali."}
                </p>
                <code className="block break-all rounded-lg border border-[#f4f4f5]/10 bg-[#08080a] px-3 py-2 font-mono text-[12.5px] text-[#fdba74]">
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

          <div className="mt-10">
            <CustomerApiKeys />
          </div>
        </main>

        <footer className="border-t border-[#f4f4f5]/8 py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 text-[11.5px] text-[#71717a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
