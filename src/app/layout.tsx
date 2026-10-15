import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Instrument_Sans({
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
  themeColor: "#06070f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
