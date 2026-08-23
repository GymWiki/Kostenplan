"use client";

import { useState } from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { formatCurrency } from "@/app/lib/format";
import { cn } from "@/app/lib/cn";
import type { evaluatePriceRules } from "@/app/lib/calculator-engine";

// Subtiel, standaard ingeklapt debug-paneel voor de eigenaar in Testmodus
// (Deel 10 van de UI/UX-herontwerpopdracht) — toont exact dezelfde
// `evaluatie`/`totaal` die ook de gewone, klant-zichtbare kaart gebruikt,
// dus er is geen aparte berekening en geen risico dat dit paneel iets
// anders laat zien dan wat er daadwerkelijk doorgerekend wordt. Wordt door
// de aanroeper alléén gerenderd wanneer previewModus actief is — een echte
// klant ziet dit component nooit.
export function DebugPaneel({
  gekozenWaarden,
  evaluatie,
  totaal,
}: {
  gekozenWaarden: { label: string; waarde: string }[];
  evaluatie: ReturnType<typeof evaluatePriceRules>;
  totaal: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-dashed border-border print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Berekeningsdetails (alleen voor jou zichtbaar)
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-dashed border-border px-3 py-3 text-xs">
          {gekozenWaarden.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-foreground">Gekozen waarden</p>
              <div className="flex flex-col gap-0.5">
                {gekozenWaarden.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted-foreground">{item.label}</span>
                    <span className="shrink-0 font-medium text-foreground">{item.waarde}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evaluatie.lineItems.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-foreground">Prijsregels</p>
              <div className="flex flex-col gap-0.5">
                {evaluatie.lineItems.map((item) => (
                  <div key={item.ruleId} className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted-foreground">
                      {item.label}
                      {!item.toonInUitsplitsing && " (verborgen voor klant)"}
                    </span>
                    <span className="shrink-0 font-medium text-foreground">{formatCurrency(item.bedrag)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-dashed border-border pt-2 font-semibold text-foreground">
            <span>Totaal</span>
            <span>{formatCurrency(totaal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
