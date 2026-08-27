"use client";

import { useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidatieMelding } from "@/app/lib/calculator-engine";
import { Overlay } from "@/app/components/ui/overlay";
import { cn } from "@/app/lib/cn";

// Vervangt de eerdere gestapelde rode/oranje waarschuwingsblokken (die
// meteen onder de header voelden alsof de gebruiker continu fouten aan het
// maken was) door één compacte "N aandachtspunten"-balk. Zelfde
// trigger+Overlay(zonder backdrop)+fixed-positie-patroon als DropdownMenu,
// maar met rijkere inhoud (klikbaar naar de betreffende vraag/prijsregel
// i.p.v. een generieke menu-actie).
export function AandachtspuntenSamenvatting({
  meldingen,
  onNavigate,
}: {
  meldingen: ValidatieMelding[];
  onNavigate: (melding: ValidatieMelding) => void;
}) {
  const [open, setOpen] = useState(false);
  const [positie, setPositie] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (meldingen.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        Geen problemen gevonden.
      </p>
    );
  }

  const fouten = meldingen.filter((m) => m.ernst === "FOUT");
  const blokkeert = fouten.length > 0;

  function openPopover() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPositie({ top: rect.bottom + 6, left: rect.left, width: Math.max(320, rect.width) });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          blokkeert ? "bg-destructive/10 text-destructive hover:bg-destructive/15" : "bg-warning/10 text-warning hover:bg-warning/15"
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {meldingen.length} {meldingen.length === 1 ? "aandachtspunt" : "aandachtspunten"}
      </button>

      <Overlay open={open} onClose={() => setOpen(false)} ariaLabel="Aandachtspunten" backdropClassName="">
        {positie && (
          <div
            role="dialog"
            style={{ top: positie.top, left: positie.left, width: positie.width, maxWidth: "calc(100vw - 2rem)" }}
            className="fixed z-[110] flex max-h-[60vh] flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg"
          >
            {meldingen.map((melding, i) => {
              const Icon = melding.ernst === "FOUT" ? AlertCircle : AlertTriangle;
              const klikbaar = melding.veldId != null || melding.regelId != null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNavigate(melding);
                  }}
                  disabled={!klikbaar}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    klikbaar ? "cursor-pointer hover:bg-secondary" : "cursor-default"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", melding.ernst === "FOUT" ? "text-destructive" : "text-warning")} />
                  <span className="text-foreground">{melding.boodschap}</span>
                </button>
              );
            })}
          </div>
        )}
      </Overlay>
    </>
  );
}
