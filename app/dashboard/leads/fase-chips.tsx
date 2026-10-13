"use client";

import { cn } from "@/app/lib/cn";
import { FASE_FILTERS, valtOnderFilter, type FaseFilter } from "@/app/lib/lead-fase";
import type { LeadWithNotes } from "./leads-view";

// Filterchips op fase met aantallen (Nieuw, Offerte, Akkoord, Te factureren, Openstaand, Te laat, Afgerond).
export function FaseChips({ leads, waarde, onKies }: { leads: LeadWithNotes[]; waarde: FaseFilter; onKies: (f: FaseFilter) => void }) {
  return (
    <div role="group" aria-label="Filter op fase" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {FASE_FILTERS.map((c) => {
        const aantal = leads.filter((l) => valtOnderFilter(l.voortgang, c.waarde)).length;
        const actief = waarde === c.waarde;
        return (
          <button
            key={c.waarde}
            type="button"
            aria-pressed={actief}
            onClick={() => onKies(c.waarde)}
            className={cn(
              "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9",
              actief ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
              c.waarde === "te-laat" && aantal > 0 && !actief && "border-destructive/40 text-destructive"
            )}
          >
            {c.label}
            <span className={cn("tabular-nums", actief ? "opacity-90" : "text-muted-foreground")}>{aantal}</span>
          </button>
        );
      })}
    </div>
  );
}
