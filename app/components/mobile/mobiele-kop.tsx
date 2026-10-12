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
        data-mobiele-kop
        className={cn(
          "sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-background/90 px-2 backdrop-blur transition-[height] motion-reduce:transition-none md:hidden",
          klein ? "h-12" : "h-14"
        )}
      >
        {onTerug ? (
          <button type="button" onClick={onTerug} aria-label="Terug" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground">
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : terug ? (
          <Link href={terug} aria-label="Terug" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground">
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
        ) : (
          <span className="w-2 shrink-0" aria-hidden="true" />
        )}
        <h1 className={cn("min-w-0 flex-1 truncate font-bold text-foreground transition-[font-size] motion-reduce:transition-none", klein ? "text-base" : "text-lg")}>
          {titel}
        </h1>
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
