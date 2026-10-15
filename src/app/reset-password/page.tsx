import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Atur password baru — Morvexa",
  description: "Buat password baru untuk akun Morvexa Anda.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
