"use client";

import React from "react";

interface AmbientFieldProps {
  /** Adds a second, warmer bloom on the right edge. */
  variant?: "hero" | "quiet";
  className?: string;
}

/**
 * Slow-moving colour blooms plus a fine grid, sitting behind page content.
 *
 * Purely decorative and pointer-transparent. The grain overlay (`.grain`)
 * is applied by the parent so it also textures any content layered above.
 */
export function AmbientField({ variant = "quiet", className = "" }: AmbientFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#06070f_0%,#070912_45%,#06070f_100%)]" />

      {/* Structural grid — very low contrast so it reads as texture, not layout. */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(233,237,251,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(233,237,251,0.09) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 20%, transparent 78%)",
        }}
      />

      <div className="animate-aurora absolute -top-[22%] left-[6%] h-[52rem] w-[52rem] rounded-full bg-[#2a3576]/35 blur-[150px]" />
      <div
        className="animate-aurora absolute -top-[10%] left-[38%] h-[38rem] w-[38rem] rounded-full bg-[#5b8def]/22 blur-[130px]"
        style={{ animationDelay: "-7s" }}
      />

      {variant === "hero" && (
        <>
          <div
            className="animate-aurora absolute top-[18%] right-[2%] h-[34rem] w-[34rem] rounded-full bg-[#c0549f]/14 blur-[140px]"
            style={{ animationDelay: "-13s" }}
          />
          <div
            className="animate-aurora absolute bottom-[-18%] left-[22%] h-[30rem] w-[30rem] rounded-full bg-[#6c63ff]/16 blur-[140px]"
            style={{ animationDelay: "-4s" }}
          />
        </>
      )}

      {/* Vignette keeps the eye centred on content. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,transparent_35%,rgba(4,5,12,0.75)_100%)]" />
    </div>
  );
}
