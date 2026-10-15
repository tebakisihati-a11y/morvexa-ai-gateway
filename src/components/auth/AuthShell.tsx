"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AgentCore } from "@/components/visual/AgentCore";
import { AmbientField } from "@/components/visual/AmbientField";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Rendered under the form: cross-links and legal copy. */
  footer: React.ReactNode;
  /** Right-hand copy that explains what this account unlocks. */
  highlights: { title: string; body: string }[];
}

/**
 * Split layout shared by /login and /signup.
 *
 * The form is a plain document-level column (not a modal) so the browser's
 * password manager, autofill and back button all behave normally — which is
 * where the previous modal-only flow fell down.
 */
export function AuthShell({ title, subtitle, children, footer, highlights }: AuthShellProps) {
  return (
    <div className="grain relative min-h-screen overflow-hidden bg-[#06070f]">
      <AmbientField variant="hero" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* Form column                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col px-5 py-8 sm:px-10 lg:py-12">
          <header className="flex items-center justify-between">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#5b8def]/35 bg-[#5b8def]/12 font-mono text-[13px] font-bold text-[#9db9f5]">
                M
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-[#e9edfb]">
                Morvexa
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-[12.5px] text-[#8e97bc] transition-colors hover:text-[#e9edfb]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Beranda
            </Link>
          </header>

          <main className="flex flex-1 items-center py-10">
            <div className="w-full max-w-[26rem]">
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[34px]">
                {title}
              </h1>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#8e97bc]">{subtitle}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-6">{footer}</div>
            </div>
          </main>

          <p className="text-[11.5px] leading-relaxed text-[#5a6390]">
            Morvexa tidak akan pernah meminta password Anda melalui email atau chat.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Visual column — hidden on small screens to keep the form prominent */}
        {/* ---------------------------------------------------------------- */}
        <div className="relative hidden border-l border-[#e9edfb]/8 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_70%_30%,rgba(42,53,118,0.5),transparent_70%)]" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e9edfb]/12 bg-[#06070f]/60 px-3 py-1.5 font-mono text-[10.5px] tracking-wide text-[#8e97bc] backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-[#5b8def]" />
                SESI COOKIE TERENKRIPSI
              </span>
            </div>

            <div className="pointer-events-none relative mx-auto h-[22rem] w-[22rem]">
              <AgentCore className="h-full w-full" interactive={false} />
            </div>

            <div className="space-y-6">
              {highlights.map((item) => (
                <div key={item.title} className="border-l border-[#5b8def]/40 pl-4">
                  <h3 className="text-[14.5px] font-semibold text-[#e9edfb]">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#8e97bc]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
