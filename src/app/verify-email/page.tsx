import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verifikasi email — Morvexa",
  description: "Verifikasi alamat email Anda untuk mengaktifkan akun Morvexa.",
};

/**
 * useSearchParams reads the token at render time, which forces a client
 * boundary. Wrapping in Suspense keeps the route statically prerenderable.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailClient />
    </Suspense>
  );
}
