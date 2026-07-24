"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { getHelpContent, type HelpContentKey } from "@/app/lib/helpContent";

type Placement = {
  top: number;
  left: number;
  origin: "top" | "bottom";
  alignRight: boolean;
};

type HelpTipProps = {
  contentKey?: HelpContentKey;
  title?: string;
  description?: string;
  className?: string;
};

// Klik-om-te-openen uitlegicoontje (geen hover, want de app draait ook op
// mobiel). Positioneert zichzelf via een "welke viewporthelft"-heuristiek
// i.p.v. een volledige meet-pass, zodat het altijd binnen beeld blijft
// zonder een positioneringslibrary nodig te hebben.
export function HelpTip({ contentKey, title, description, className }: HelpTipProps) {
  const base = contentKey ? getHelpContent(contentKey) : null;
  const resolvedTitle = title ?? base?.title ?? "";
  const resolvedDescription = description ?? base?.description ?? "";

  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    function computePlacement() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const isRightHalf = rect.left > window.innerWidth / 2;
      const isBottomHalf = rect.top > window.innerHeight / 2;

      const gap = 8;
      const top = isBottomHalf ? rect.top - gap : rect.bottom + gap;
      const left = isRightHalf ? rect.right : rect.left;

      setPlacement({
        top,
        left: isRightHalf ? window.innerWidth - left : left,
        origin: isBottomHalf ? "bottom" : "top",
        alignRight: isRightHalf,
      });
    }

    computePlacement();

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClose() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [open]);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={resolvedTitle ? `Uitleg: ${resolvedTitle}` : "Meer uitleg"}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && placement && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          style={{
            position: "fixed",
            top: placement.top,
            left: placement.alignRight ? undefined : placement.left,
            right: placement.alignRight ? placement.left : undefined,
            transform: placement.origin === "bottom" ? "translateY(-100%)" : undefined,
            maxWidth: "min(280px, calc(100vw - 2rem))",
          }}
          className="z-50 rounded-md border border-border bg-card p-3 text-left shadow-lg"
        >
          {resolvedTitle && (
            <p className="text-sm font-medium text-foreground">{resolvedTitle}</p>
          )}
          {resolvedDescription && (
            <p className="mt-1 text-xs text-muted-foreground">{resolvedDescription}</p>
          )}
        </div>
      )}
    </span>
  );
}
