"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Overlay } from "@/app/components/ui/overlay";

// Gestylede vervanger van window.confirm() — voor bevestigingen die bij het
// merkgevoel van de app passen, i.p.v. de kale browserdialoog. Bedoeld voor
// de "lichte" verwijderbevestiging (één rij, één materiaal, één notitie);
// het verwijderen van een heel bedrijf blijft bewust de zwaardere
// typ-ter-bevestiging-flow (zie profiel/company-card.tsx) — dit component
// vervangt confirm(), niet die aparte, zwaardere flow.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  pending = false,
  title,
  description,
  confirmLabel = "Verwijderen",
  cancelLabel = "Annuleren",
  variant = "destructive",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
}) {
  return (
    <Overlay open={open} onClose={onClose} ariaLabelledBy="confirm-dialog-title" className="flex items-center justify-center p-4">
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <span
          className={
            variant === "destructive"
              ? "flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              : "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <AlertTriangle className="h-5 w-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            variant={variant}
            className="flex-1"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Bezig…" : confirmLabel}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
