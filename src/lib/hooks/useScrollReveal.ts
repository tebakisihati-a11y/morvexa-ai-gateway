"use client";

import { useEffect } from "react";

/**
 * Adds `is-visible` to every `.reveal` element as it enters the viewport.
 *
 * A single observer is shared across the page rather than one per component.
 * Elements already on screen at mount (above the fold) are revealed
 * immediately so nothing can stay invisible if the observer never fires.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (elements.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    elements.forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);
}
