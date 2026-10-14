"use client";

import { useEffect, useState, type RefObject } from "react";

// Vaste balk onderin met het lopende totaal zolang de kostenraming zelf buiten beeld is (bij het invullen van
// onderdelen staat die ver onder het scherm). Tikken scrolt naar de kostenraming. Verdwijnt zodra die zichtbaar is.
export function LopendTotaal({ tekst, kaartRef }: { tekst: string; kaartRef: RefObject<HTMLElement | null> }) {
  const [zichtbaar, setZichtbaar] = useState(true);
  useEffect(() => {
    const el = kaartRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => setZichtbaar(Boolean(e?.isIntersecting)), { threshold: 0.15 });
    o.observe(el);
    return () => o.disconnect();
  }, [kaartRef]);
  if (zichtbaar) return null;
  return (
    <button
      type="button"
      onClick={() => kaartRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })}
      className="fixed inset-x-0 bottom-0 z-30 flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left shadow-[0_-4px_16px_rgba(0,0,0,0.15)] print:hidden"
      style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
    >
      <span className="text-sm font-medium">Totaal tot nu toe (incl. btw)</span>
      <span className="text-lg font-bold tabular-nums">{tekst}</span>
    </button>
  );
}
