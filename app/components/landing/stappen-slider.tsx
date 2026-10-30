"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";

export type Stap = { id: string; nr: string; titel: string; inhoud: React.ReactNode };

// Slider voor "Zo werkt het": een rij slides met native scroll-snap (swipe op mobiel, een stukje van de volgende slide zichtbaar),
// pijlen en stapknoppen met titel. Alle slides staan altijd in de DOM; er wordt alleen gescrold, nooit conditioneel gerenderd.
export function StappenSlider({ stappen, label, ankers = {} }: { stappen: Stap[]; label: string; ankers?: Record<string, number> }) {
  const baan = useRef<HTMLDivElement>(null);
  const [actief, setActief] = useState(0);
  const n = stappen.length;

  const gaNaar = useCallback(
    (i: number, direct = false) => {
      const el = baan.current;
      const slide = el?.children[Math.max(0, Math.min(n - 1, i))] as HTMLElement | undefined;
      if (!el || !slide) return;
      const rustig = direct || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: slide.offsetLeft, behavior: rustig ? "auto" : "smooth" });
    },
    [n]
  );

  // Welke slide staat vooraan? Zowel bij vegen als bij pijlen.
  useEffect(() => {
    const el = baan.current;
    if (!el) return;
    let raf = 0;
    const bepaal = () => {
      raf = 0;
      const einde = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      let best = 0;
      if (einde) best = n - 1;
      else {
        let kleinste = Infinity;
        Array.from(el.children).forEach((c, i) => {
          const d = Math.abs((c as HTMLElement).offsetLeft - el.scrollLeft);
          if (d < kleinste) {
            kleinste = d;
            best = i;
          }
        });
      }
      setActief(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(bepaal);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  // Oude links (#huisstijl, #werkzaamheden) openen de slide waar die inhoud nu staat.
  useEffect(() => {
    const naarAnker = () => {
      const i = ankers[window.location.hash.slice(1)];
      if (i !== undefined) {
        document.getElementById("zo-werkt-het")?.scrollIntoView();
        gaNaar(i, true);
      }
    };
    naarAnker();
    window.addEventListener("hashchange", naarAnker);
    return () => window.removeEventListener("hashchange", naarAnker);
  }, [ankers, gaNaar]);

  function bijToets(e: React.KeyboardEvent) {
    // Pijltjes in een invoerveld (zoals de voor/na-schuifregelaar) horen bij dat veld.
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") gaNaar(actief + 1);
    else if (e.key === "ArrowLeft") gaNaar(actief - 1);
    else if (e.key === "Home") gaNaar(0);
    else if (e.key === "End") gaNaar(n - 1);
    else return;
    e.preventDefault();
  }

  const pijl = "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-lp-lijn bg-lp-wit text-lp-inkt transition-colors hover:bg-lp-papier-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lp-wit";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} onKeyDown={bijToets}>
      <div className="flex items-center justify-between gap-4">
        <div role="group" aria-label="Kies een stap" className="flex min-w-0 flex-wrap gap-2">
          {stappen.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === actief ? "step" : undefined}
              onClick={() => gaNaar(i)}
              className={cn(
                "flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                i === actief ? "border-lp-bos-800 bg-lp-bos-800 text-white" : "border-lp-lijn bg-lp-wit text-lp-inkt hover:bg-lp-papier-2"
              )}
            >
              <span className="font-lp-maat text-xs">{s.nr}</span>
              <span className="sr-only md:not-sr-only">{s.titel}</span>
            </button>
          ))}
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" aria-label="Vorige stap" disabled={actief === 0} onClick={() => gaNaar(actief - 1)} className={pijl}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Volgende stap" disabled={actief === n - 1} onClick={() => gaNaar(actief + 1)} className={pijl}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={baan}
        tabIndex={0}
        aria-label="Stappen, gebruik de pijltjestoetsen om te wisselen"
        className="relative mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
      >
        {stappen.map((s, i) => (
          <div
            key={s.id}
            id={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Stap ${i + 1} van ${n}: ${s.titel}`}
            className="min-w-0 shrink-0 basis-[88%] snap-start sm:basis-full"
          >
            {s.inhoud}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        Stap {actief + 1} van {n}: {stappen[actief]?.titel}
      </p>
    </div>
  );
}
