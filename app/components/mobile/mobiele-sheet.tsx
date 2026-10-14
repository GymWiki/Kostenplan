"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { usePortalDoel } from "./use-mobiel";

export type SheetStand = "half" | "volledig";

// Ruimte tussen de onderkant van de editor-kopbalk en de bovenkant van de sheet.
const KOP_RUIMTE = 8;
const KOP_BODEM = "var(--editor-header-bottom, 3.5rem)";

// Plaatst een knop (bijv. het ⋯-menu) in de kop van de sheet, naast de sluitknop.
export function SheetActie({ children }: { children: React.ReactNode }) {
  const doel = usePortalDoel("#sheet-actie");
  return doel && doel.id === "sheet-actie" ? createPortal(children, doel) : null;
}

const FOCUSBAAR = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Bottom sheet voor mobiel met twee standen (half / volledig). Sluit via de
// knop, door naar beneden te vegen, met Escape en met het terug-gebaar van
// Android/iOS (de sheet legt één geschiedenisregel vast). Focus blijft binnen
// de sheet, de pagina erachter scrollt niet mee, en bij een open toetsenbord
// past de hoogte zich aan de zichtbare ruimte aan.
function SheetInhoud({
  open,
  onClose,
  titel,
  titelNode,
  icoon,
  children,
  voet,
  beginStand = "half",
  className,
}: {
  open: boolean;
  onClose: () => void;
  titel: string;
  // Eigen inhoud voor de titel (bijv. een naam die je ter plekke kunt wijzigen); `titel` blijft de tekst voor schermlezers.
  titelNode?: React.ReactNode;
  icoon?: React.ReactNode;
  children: React.ReactNode;
  voet?: React.ReactNode;
  beginStand?: SheetStand;
  className?: string;
}) {
  const titelId = useId();
  const paneel = useRef<HTMLDivElement>(null);
  const [stand, setStand] = useState<SheetStand>(beginStand);
  const [sleep, setSleep] = useState(0);
  const start = useRef<number | null>(null);
  const [zichtbaar, setZichtbaar] = useState<number | null>(null);
  const doel = usePortalDoel();
  const historyActief = useRef(false);
  const sluitRef = useRef(onClose);
  useEffect(() => {
    sluitRef.current = onClose;
  }, [onClose]);

  // Sluiten: dezelfde route voor knop, vegen en backdrop; het terug-gebaar
  // (popstate) komt hier ook uit, dus we ruimen de geschiedenisregel op.
  const sluit = useCallback(() => {
    if (historyActief.current) {
      historyActief.current = false;
      history.back();
    }
    sluitRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;
    const vorigeFocus = document.activeElement as HTMLElement | null;
    history.pushState({ kpSheet: true }, "");
    historyActief.current = true;
    function bijTerug() {
      if (historyActief.current) {
        historyActief.current = false;
        sluitRef.current();
      }
    }
    window.addEventListener("popstate", bijTerug);
    // Scroll vergrendelen op <html>: een inline overflow op <body> maakt van body een eigen
    // scrollcontainer en dan scrolt de sticky kop weg (en klopt --editor-header-bottom niet meer).
    const root = document.documentElement;
    const vorigeOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const vv = window.visualViewport;
    function bijViewport() {
      setZichtbaar(vv ? vv.height : null);
    }
    vv?.addEventListener("resize", bijViewport);
    bijViewport();

    // eerste focusbare element, anders het paneel zelf
    const t = setTimeout(() => {
      const eerste = paneel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? paneel.current?.querySelector<HTMLElement>(FOCUSBAAR);
      (eerste ?? paneel.current)?.focus({ preventScroll: true });
    }, 30);

    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", bijTerug);
      vv?.removeEventListener("resize", bijViewport);
      root.style.overflow = vorigeOverflow;
      vorigeFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  function bijToets(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      sluit();
      return;
    }
    if (e.key !== "Tab" || !paneel.current) return;
    const lijst = [...paneel.current.querySelectorAll<HTMLElement>(FOCUSBAAR)].filter((el) => el.offsetParent !== null);
    if (lijst.length === 0) return;
    const eerste = lijst[0];
    const laatste = lijst[lijst.length - 1];
    if (e.shiftKey && document.activeElement === eerste) {
      e.preventDefault();
      laatste.focus();
    } else if (!e.shiftKey && document.activeElement === laatste) {
      e.preventDefault();
      eerste.focus();
    }
  }

  if (!doel) return null;

  // Volledig = van net onder de kopbalk tot de onderkant van het zichtbare
  // scherm (met toetsenbord: tot boven het toetsenbord); half = 55 % daarvan.
  const maxH = zichtbaar ? Math.min(zichtbaar, window.innerHeight) : null;
  const beschikbaar = `${maxH ? `${Math.round(maxH)}px` : "100dvh"} - ${KOP_BODEM} - ${KOP_RUIMTE}px`;
  const stijl: React.CSSProperties = {
    height: stand === "volledig" ? `calc(${beschikbaar})` : `calc((${beschikbaar}) * 0.6)`,
    transform: sleep !== 0 ? `translateY(${Math.max(0, sleep)}px)` : undefined,
    bottom: zichtbaar && window.visualViewport ? `${Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop)}px` : 0,
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[100] md:hidden" style={{ top: KOP_BODEM }}>
      <button type="button" aria-label="Sluiten" tabIndex={-1} onClick={sluit} className="absolute inset-0 cursor-default bg-black/45" />
      <div
        ref={paneel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelNode ? undefined : titelId}
        aria-label={titelNode ? titel : undefined}
        tabIndex={-1}
        onKeyDown={bijToets}
        style={stijl}
        className={cn(
          "absolute inset-x-0 flex flex-col rounded-t-2xl border border-b-0 border-border bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.2)] outline-none motion-safe:transition-[height,transform] motion-safe:duration-200",
          sleep !== 0 && "transition-none",
          className
        )}
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center pt-2"
          onPointerDown={(e) => {
            start.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setSleep(e.clientY - start.current);
          }}
          onPointerUp={() => {
            if (sleep > 80) {
              if (stand === "volledig") setStand("half");
              else sluit();
            } else if (sleep < -60) setStand("volledig");
            start.current = null;
            setSleep(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setSleep(0);
          }}
        >
          <span className="mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/40" aria-hidden="true" />
          <div className="flex w-full items-center gap-2 px-4">
            {icoon}
            <h2 id={titelId} className={cn("min-w-0 flex-1 text-lg font-bold text-foreground", !titelNode && "truncate")}>
              {titelNode ?? titel}
            </h2>
            <div id="sheet-actie" className="flex shrink-0 items-center" />
            <button
              type="button"
              onClick={sluit}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Sluiten"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2"
          onFocus={(e) => {
            // Toetsenbord open: het actieve veld blijft in beeld.
            const el = e.target as HTMLElement;
            if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
          }}
        >
          {children}
        </div>
        {voet && <div className="shrink-0 border-t border-border px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{voet}</div>}
      </div>
    </div>,
    doel
  );
}

export function MobieleSheet(props: React.ComponentProps<typeof SheetInhoud>) {
  // Alleen gemonteerd zolang hij open is: elke keer opnieuw in de beginstand.
  return props.open ? <SheetInhoud {...props} /> : null;
}
