"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";

type Stand = "hoog" | "half";

// Niet-blokkerend bottom sheet voor mobiel (editor): de pagina erachter blijft
// zichtbaar en bruikbaar, en de kopbalk van de editor blijft vrij.
//  - Opent tot net onder de kopbalk: de bovenkant volgt de CSS-variabele
//    --editor-header-bottom (door de editor gemeten), de hoogte volgt
//    --editor-vvh (zichtbare hoogte, krimpt mee met het toetsenbord).
//  - Slepen aan de greep: tot ± de helft laat hem op de helft staan (je ziet
//    de rekentool erachter live veranderen), verder omlaag sluit hem.
//  - Eén kop: met `zonderTitel` toont de sheet alleen een sluitknop rechtsboven
//    (de inhoud heeft zelf een kop); de titel blijft voor schermlezers.
function SheetInhoud({
  open,
  onClose,
  titel,
  zonderTitel = false,
  onMaat,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  titel: string;
  zonderTitel?: boolean;
  // Meldt de huidige hoogte in px (0 = dicht), zodat de editor de rekentool erboven kan laten staan.
  onMaat?: (hoogte: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [stand, setStand] = useState<Stand>("hoog");
  const [sleep, setSleep] = useState(0);
  const [vol, setVol] = useState(600);
  const start = useRef<number | null>(null);
  const paneel = useRef<HTMLElement>(null);
  const onMaatRef = useRef(onMaat);
  useEffect(() => {
    onMaatRef.current = onMaat;
  });

  // Beschikbare hoogte tussen kopbalk en onderkant van het zichtbare scherm.
  const meet = useCallback(() => {
    const root = document.documentElement;
    const kop = parseFloat(getComputedStyle(root).getPropertyValue("--editor-header-bottom")) || 56;
    const vvh = parseFloat(getComputedStyle(root).getPropertyValue("--editor-vvh")) || window.innerHeight;
    setVol(Math.max(120, vvh - kop - 8));
  }, []);

  useEffect(() => {
    if (!open) return;
    const eerste = requestAnimationFrame(meet);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", meet);
    window.addEventListener("resize", meet);
    // Het actieve veld scrolt boven het toetsenbord uit, binnen de sheet.
    function bijFocus(e: FocusEvent) {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !paneel.current?.contains(el)) return;
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    }
    document.addEventListener("focusin", bijFocus);
    return () => {
      cancelAnimationFrame(eerste);
      vv?.removeEventListener("resize", meet);
      window.removeEventListener("resize", meet);
      document.removeEventListener("focusin", bijFocus);
    };
  }, [open, meet]);

  const extra = (stand === "half" ? vol / 2 : 0) + Math.max(0, sleep);
  const hoogte = Math.max(100, vol - extra);

  useEffect(() => {
    onMaatRef.current?.(open ? hoogte + 8 : 0);
    return () => onMaatRef.current?.(0);
  }, [open, hoogte]);

  function laatLos() {
    if (start.current === null) return;
    const dy = sleep;
    start.current = null;
    setSleep(0);
    if (stand === "hoog") {
      if (dy > vol * 0.65) onClose();
      else if (dy > 70) setStand("half");
    } else if (dy > 60) onClose();
    else if (dy < -50) setStand("hoog");
  }

  return (
    <section
      ref={paneel}
      role="dialog"
      aria-label={titel}
      data-bottom-sheet
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: `calc(var(--editor-header-bottom, 3.5rem) + 8px + ${extra}px)`,
        height: `${hoogte}px`,
      }}
      className={cn(
        "z-40 flex flex-col rounded-t-2xl border border-b-0 border-border bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.18)]",
        "[-webkit-tap-highlight-color:transparent]",
        sleep === 0 && "motion-safe:transition-[top,height] motion-safe:duration-200",
        className
      )}
    >
      <div
        className="flex shrink-0 touch-none select-none items-center justify-center pt-2 pb-1"
        onPointerDown={(e) => {
          start.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current !== null) setSleep(e.clientY - start.current);
        }}
        onPointerUp={laatLos}
        onPointerCancel={() => {
          start.current = null;
          setSleep(0);
        }}
      >
        <span className="h-1.5 w-12 rounded-full bg-muted-foreground/40" aria-hidden="true" />
      </div>
      {zonderTitel ? (
        <h2 className="sr-only">{titel}</h2>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-2 pl-4 pr-2">
          <h2 className="min-w-0 truncate text-base font-bold text-foreground">{titel}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary active:bg-secondary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {zonderTitel && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-2 top-[18px] z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary active:bg-secondary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
    </section>
  );
}

export function BottomSheet(props: React.ComponentProps<typeof SheetInhoud>) {
  // Alleen gemonteerd zolang hij open is: elke keer opnieuw in de hoge stand.
  return props.open ? <SheetInhoud {...props} /> : null;
}
