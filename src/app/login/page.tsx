import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Morvexa",
  description: "Masuk ke portal kustomer Morvexa untuk mengelola API key, kuota dan tagihan.",
};

export default function LoginPage() {
  return <LoginForm />;
}
