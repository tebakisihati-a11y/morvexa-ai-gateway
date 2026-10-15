import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Morvexa",
  description: "Masuk ke portal kustomer Morvexa untuk mengelola API key, kuota dan tagihan.",
};

export default function LoginPage() {
  return (
    // useSearchParams requires a Suspense boundary during prerendering.
    <Suspense fallback={<div className="min-h-screen bg-[#06070f]" />}>
      <LoginForm />
    </Suspense>
  );
}
