"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/lib/cn";

const FOCUSBAAR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// De bovenste open overlay: alleen die reageert op Escape en Tab (een sheet boven een drawer sluit eerst zichzelf).
const stapel: symbol[] = [];

function focusbaar(dialoog: HTMLElement): HTMLElement[] {
  return [...dialoog.querySelectorAll<HTMLElement>(FOCUSBAAR)].filter((el) => !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true" && el.tabIndex !== -1 && el.getClientRects().length > 0);
}

// Maakt alles buiten de dialoog inert (niet te focussen, niet te klikken, verborgen voor schermlezers) en geeft een
// functie terug die precies dat weer terugdraait. Werkt ook voor een overlay boven een overlay.
function maakRestInert(dialoog: HTMLElement): () => void {
  const gezet: HTMLElement[] = [];
  for (let knoop: HTMLElement = dialoog; knoop.parentElement && knoop !== document.body; knoop = knoop.parentElement) {
    for (const zus of knoop.parentElement.children) {
      if (zus === knoop || !(zus instanceof HTMLElement) || zus.hasAttribute("inert")) continue;
      zus.setAttribute("inert", "");
      gezet.push(zus);
    }
  }
  return () => gezet.forEach((el) => el.removeAttribute("inert"));
}

// Gedeelde mechaniek achter elke overlay in de app (modal, drawer, mobiel
// menu, dropdown): portal naar document.body, Escape-toets sluit 'm, en de
// onderliggende pagina scrollt niet mee terwijl hij open staat. Voorheen vijf
// keer los geïmplementeerd (MobileNav, CompanySwitcher, LeadDetailDrawer,
// CancelRetentionModal, UpgradeModal) — dit is nu de ene plek die dat regelt.
// Bewust GEEN visuele vorm (gecentreerd/drawer/dropdown, paneelstijl) —
// alleen de mechaniek. De backdrop-styling is wél overrideable, want een
// dropdown (bijna onzichtbare backdrop) en een modal (donker + blur) hebben
// bewust een ander gewicht.
export function Overlay({
  open,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  backdropClassName = "bg-black/50 backdrop-blur-sm",
  className,
  portalDoel,
  zichtbaarGebied,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  backdropClassName?: string;
  className?: string;
  // Waar de overlay in de pagina komt (standaard: het admin-thema of de body). De klant-rekentool geeft hier zijn eigen
  // schil mee, zodat de merkkleuren (CSS-variabelen) ook in de overlay gelden.
  portalDoel?: HTMLElement | null;
  // Alleen voor een rekentool die in een iframe op de site van de hovenier staat: het deel van de iframe dat de bezoeker
  // nu ziet. De overlay beslaat dan alleen dat deel (anders staat hij ergens in de hoge iframe buiten beeld).
  zichtbaarGebied?: { top: number; height: number } | null;
}) {
  const dialoog = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Open: focus naar binnen, de rest van de pagina inert, Tab blijft in de dialoog, Escape sluit de bovenste, scroll-lock.
  // Dicht: alles terug en de focus naar wat de overlay opende.
  useEffect(() => {
    if (!open) return;
    const el = dialoog.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = Symbol("overlay");
    stapel.push(id);
    const herstelInert = maakRestInert(el);
    const eerste = focusbaar(el).find((x) => !x.hasAttribute("data-sluiten")) ?? focusbaar(el)[0];
    if (eerste) eerste.focus();
    else el.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (stapel[stapel.length - 1] !== id) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !el) return;
      const lijst = focusbaar(el);
      if (lijst.length === 0) {
        event.preventDefault();
        el.focus();
        return;
      }
      const eerstE = lijst[0]!;
      const laatste = lijst[lijst.length - 1]!;
      const actief = document.activeElement;
      if (event.shiftKey && (actief === eerstE || actief === el || !el.contains(actief))) {
        event.preventDefault();
        laatste.focus();
      } else if (!event.shiftKey && (actief === laatste || !el.contains(actief))) {
        event.preventDefault();
        eerstE.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const vorigeOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = stapel.length > 1 ? "hidden" : vorigeOverflow;
      herstelInert();
      stapel.splice(stapel.indexOf(id), 1);
      // Focus terug naar de opener (als die er nog is); anders blijft de focus waar de browser hem zet.
      if (opener && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  // Binnen het admin-thema renderen (anders valt de overlay buiten de
  // thema-variabelen van het dashboard).
  const doel = portalDoel ?? document.querySelector<HTMLElement>("[data-admin-theme], [data-lp]") ?? document.body;
  return createPortal(
    <div
      ref={dialoog}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(zichtbaarGebied ? "absolute inset-x-0 z-[100] outline-none" : "fixed inset-0 z-[100] outline-none", className)}
      style={zichtbaarGebied ? { top: zichtbaarGebied.top, height: zichtbaarGebied.height } : undefined}
    >
      <button
        type="button"
        aria-label="Sluiten"
        data-sluiten
        onClick={onClose}
        className={cn("absolute inset-0 cursor-pointer", backdropClassName)}
      />
      {/* isolate (zonder position:relative): zonder een eigen stacking
          context wordt de eigenlijke dialooginhoud hierboven zelf mee-
          geblurd door de backdrop-blur van de sluitknop hierboven (bekend
          backdrop-filter-compositinggedrag in Chromium: een sibling zonder
          eigen z-index/stacking context kan worden meegenomen in de
          backdrop-sample) — het scherm oogt dan grijs/onleesbaar in plaats
          van een scherp dialoogvenster op een wazige achtergrond.
          `isolation: isolate` alleen is genoeg voor die stacking context en
          verandert niets aan de layout; `position: relative` zou dat wél
          doen — het maakt deze wrapper dan zelf de containing block voor elk
          absoluut gepositioneerd kind (bijv. een drawer met
          `absolute inset-y-0`), wat top/bottom onbepaald maakt zodra de
          wrapper zelf geen expliciete hoogte heeft. */}
      <div className="isolate">{children}</div>
    </div>,
    doel
  );
}
