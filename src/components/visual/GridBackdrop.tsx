/**
 * GridBackdrop - flat tactical grid.
 *
 * Replaces the earlier AmbientField, which layered three animated aurora blobs
 * with a grain overlay. The brief (section 2) bans decorative glow and heavy
 * blur, and section 1 requires every pixel to carry measurable system state,
 * so this is a single static 1px grid at low opacity: it reads as graph paper
 * behind data, costs no animation frames, and never competes with the numbers.
 */

interface GridBackdropProps {
  className?: string;
  /** Fades the grid out towards the bottom so long pages do not feel busy. */
  fade?: boolean;
}

export function GridBackdrop({ className = "", fade = true }: GridBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), " +
          "linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: fade ? "linear-gradient(to bottom, black, transparent 85%)" : undefined,
        WebkitMaskImage: fade ? "linear-gradient(to bottom, black, transparent 85%)" : undefined,
      }}
    />
  );
}
