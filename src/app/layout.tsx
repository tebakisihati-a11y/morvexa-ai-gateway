import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Brief section 3B: Inter for interface text, JetBrains Mono for every number,
// model id, log line and token counter so figures stay tabular.
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Morvexa — Universal AI Gateway",
  description:
    "One authenticated endpoint for Anthropic, OpenAI, DeepSeek and Gemini. Failover mesh, streaming inference, and per-tenant quota accounting.",
  openGraph: {
    title: "Morvexa — Universal AI Gateway",
    description:
      "One authenticated endpoint for every frontier model. Failover mesh, streaming inference, per-tenant quotas.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${body.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
