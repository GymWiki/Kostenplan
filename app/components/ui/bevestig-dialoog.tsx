"use client";

import { useId } from "react";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";

// Bevestigingsdialoog met eigen inhoud (samenvatting, lijst, keuze) en altijd "Bevestigen" en "Annuleren". Op een telefoon een
// scrollbaar venster met knoppen onderaan; Escape en tikken buiten het venster annuleren.
export function BevestigDialoog({
  open,
  titel,
  children,
  onBevestig,
  onAnnuleer,
  bezig = false,
  fout,
  bevestigLabel = "Bevestigen",
}: {
  open: boolean;
  titel: string;
  children: React.ReactNode;
  onBevestig: () => void;
  onAnnuleer: () => void;
  bezig?: boolean;
  fout?: string | null;
  bevestigLabel?: string;
}) {
  const titelId = useId();
  return (
    <Overlay open={open} onClose={() => !bezig && onAnnuleer()} ariaLabelledBy={titelId} className="flex items-center justify-center p-4">
      <div role="alertdialog" className="relative flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6">
        <h2 id={titelId} className="text-lg font-semibold text-foreground">
          {titel}
        </h2>
        <div className="flex flex-col gap-3 text-sm text-foreground">{children}</div>
        {fout && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {fout}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="button" size="lg" className="w-full sm:flex-1" disabled={bezig} onClick={onBevestig}>
            {bezig ? "Bezig…" : bevestigLabel}
          </Button>
          <Button type="button" variant="secondary" size="lg" className="w-full sm:flex-1" disabled={bezig} onClick={onAnnuleer}>
            Annuleren
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
