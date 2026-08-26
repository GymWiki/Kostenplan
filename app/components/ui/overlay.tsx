"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/lib/cn";

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
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  backdropClassName?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn("fixed inset-0 z-[100]", className)}
    >
      <button
        type="button"
        aria-label="Sluiten"
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
    document.body
  );
}
