import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Lupa password — Morvexa",
  description: "Minta tautan untuk mengatur ulang password akun Morvexa Anda.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
