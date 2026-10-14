"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { usePortalDoel } from "./use-mobiel";

type KopStand = { titel: string | null; terug: string | null; onTerug?: () => void };
const KopContext = createContext<(s: KopStand | null) => void>(() => {});

const HOOFD: Record<string, string> = {
  "/dashboard": "Vandaag",
  "/dashboard/tools": "Rekentools",
  "/dashboard/leads": "Leads",
  "/dashboard/profiel": "Profiel",
};

// Compacte kop voor mobiel: titel + terug + maximaal één actie, krimpt bij
// scrollen. Hoofdschermen krijgen hun titel vanzelf; een subscherm zet hem met
// <KopInstellen titel terug>; een actie plaatst <KopActie> in de kop.
type KopData = { stand: KopStand | null };
const KopDataContext = createContext<KopData>({ stand: null });

// Houdt de titel/terug-stand van het huidige scherm bij; omhult het hele
// dashboard zodat <KopInstellen> overal gebruikt kan worden.
export function KopProvider({ children }: { children: React.ReactNode }) {
  const [stand, setStand] = useState<KopStand | null>(null);
  return (
    <KopContext.Provider value={setStand}>
      <KopDataContext.Provider value={{ stand }}>{children}</KopDataContext.Provider>
    </KopContext.Provider>
  );
}

export function MobieleKop({ rechts }: { rechts?: React.ReactNode }) {
  const pad = usePathname();
  const { stand } = useContext(KopDataContext);
  const [klein, setKlein] = useState(false);
  const kopRef = useRef<HTMLElement>(null);

  // Onderkant van de kop als CSS-variabele: sheets beginnen daaronder en laten de kop vrij.
  useEffect(() => {
    const kop = kopRef.current;
    const root = document.documentElement;
    if (!kop) return;
    const zet = () => {
      const r = kop.getBoundingClientRect();
      if (r.height > 0) root.style.setProperty("--editor-header-bottom", `${Math.round(r.bottom)}px`);
    };
    zet();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(zet) : null;
    ro?.observe(kop);
    window.addEventListener("resize", zet);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", zet);
      root.style.removeProperty("--editor-header-bottom");
    };
  }, []);

  useEffect(() => {
    function bijScroll() {
      setKlein(window.scrollY > 24);
    }
    bijScroll();
    window.addEventListener("scroll", bijScroll, { passive: true });
    return () => window.removeEventListener("scroll", bijScroll);
  }, []);

  const hoofd = HOOFD[pad] ?? null;
  const titel = stand?.titel ?? hoofd ?? "Kostenplan";
  const terug = stand?.terug ?? null;
  const onTerug = stand?.onTerug;

  return (
    <>
      <header
        ref={kopRef}
        data-mobiele-kop
        className={cn(
          "sticky top-0 z-30 flex touch-manipulation select-none items-center gap-1 border-b border-border bg-background/90 px-2 backdrop-blur transition-[height] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] motion-reduce:transition-none md:hidden",
          klein ? "h-12" : "h-14"
        )}
      >
        {/* Pijl en titel zijn samen één knop met een tikdoel over de volle hoogte. */}
        {onTerug || terug ? <h1 className="sr-only">{titel}</h1> : null}
        {onTerug || terug ? (
          (() => {
            const klas = "-ml-1 flex min-w-0 flex-1 cursor-pointer items-center gap-1 self-stretch rounded-md pl-2 pr-3 text-foreground [-webkit-touch-callout:none] active:bg-secondary";
            const inhoud = (
              <>
                <ChevronLeft className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="sr-only">Terug naar </span>
                <span className={cn("min-w-0 truncate font-bold transition-[font-size] motion-reduce:transition-none", klein ? "text-base" : "text-lg")}>{titel}</span>
              </>
            );
            return onTerug ? (
              <button type="button" onClick={onTerug} className={klas}>
                {inhoud}
              </button>
            ) : (
              <Link href={terug!} className={klas} draggable={false}>
                {inhoud}
              </Link>
            );
          })()
        ) : (
          <h1 className={cn("min-w-0 flex-1 truncate pl-2 font-bold text-foreground transition-[font-size] motion-reduce:transition-none", klein ? "text-base" : "text-lg")}>{titel}</h1>
        )}
        <div id="kop-actie" className="flex shrink-0 items-center gap-1" />
        {rechts}
      </header>
    </>
  );
}

export function KopInstellen({ titel, terug, onTerug }: { titel?: string; terug?: string; onTerug?: () => void }) {
  const zet = useContext(KopContext);
  const terugRef = useRef(onTerug);
  useEffect(() => {
    terugRef.current = onTerug;
  }, [onTerug]);
  const heeftTerug = Boolean(onTerug);
  useEffect(() => {
    zet({ titel: titel ?? null, terug: terug ?? null, onTerug: heeftTerug ? () => terugRef.current?.() : undefined });
    return () => zet(null);
  }, [zet, titel, terug, heeftTerug]);
  return null;
}

// Plaatst een knop rechts in de mobiele kop (bijv. het ⋯-menu).
export function KopActie({ children }: { children: React.ReactNode }) {
  const doel = usePortalDoel("#kop-actie");
  return doel ? createPortal(children, doel) : null;
}
