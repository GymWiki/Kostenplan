"use client";

import { X } from "lucide-react";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";

// Paneel dat op mobiel als bottom sheet van onderen komt en op desktop als
// gecentreerd venster verschijnt. Bouwt op Overlay (portal, Escape, scroll-lock).
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      ariaLabelledBy="sheet-titel"
      
    >
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5",
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pr-10">
          <h2 id="sheet-titel" className="text-xl font-bold text-foreground">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </Overlay>
  );
}
