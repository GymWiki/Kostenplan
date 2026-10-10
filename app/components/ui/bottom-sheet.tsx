"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";

// Niet-blokkerend bottom sheet voor mobiel: de pagina erachter blijft
// zichtbaar en bruikbaar. Sluiten met de knop, Escape of door aan het
// handvat naar beneden te vegen. Max ±90% van de schermhoogte.
export function BottomSheet({
  open,
  onClose,
  titel,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  titel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [sleep, setSleep] = useState(0);
  const start = useRef<number | null>(null);

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-label={titel}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      style={{ transform: sleep > 0 ? `translateY(${sleep}px)` : undefined }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex max-h-[90dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.18)] motion-safe:transition-transform",
        sleep > 0 && "transition-none",
        className
      )}
    >
      <div
        className="flex shrink-0 touch-none items-center justify-center pt-2"
        onPointerDown={(e) => {
          start.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current !== null) setSleep(Math.max(0, e.clientY - start.current));
        }}
        onPointerUp={() => {
          if (sleep > 90) onClose();
          start.current = null;
          setSleep(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setSleep(0);
        }}
      >
        <span className="mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/40" aria-hidden="true" />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1">
        <h2 className="min-w-0 truncate text-base font-bold text-foreground">{titel}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
    </section>
  );
}
