import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morvexa AI Gateway — Universal Edge Proxy & Observability",
  description: "Next-gen zero-buffer AI proxy gateway with dual rolling quota recovery and multi-provider failover.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-orange-500/30 selection:text-orange-200">
        {children}
      </body>
    </html>
  );
}
