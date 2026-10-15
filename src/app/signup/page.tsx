import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Daftar — Morvexa",
  description:
    "Buat akun Morvexa untuk mengakses satu endpoint bagi Anthropic, OpenAI, DeepSeek dan Gemini.",
};

export default function SignupPage() {
  return <SignupForm />;
}
