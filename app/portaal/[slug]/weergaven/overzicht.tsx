"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import type { PricingResult } from "@/app/lib/pricing/engine";
import { formatCenten, formatHoeveelheid } from "@/app/lib/pricing/format";
import { onderdeelInclCenten } from "@/app/lib/weergave/bedragen";
import { Bewerkbaar } from "../bewerkbaar";
import type { ProductWithDetails } from "../calculator";
import { OnderdeelIcoon } from "./gedeeld";

// Het gedeelde overzichtsscherm van tegels en stappen: wat de klant heeft gekozen, met aanpassen en verwijderen.
// Eronder staan de kostenraming en het aanvraagformulier (voor alle weergaven hetzelfde).
export function OverzichtWeergave({
  producten,
  toegevoegd,
  resultaat,
  prijsVerborgen,
  onAanpassen,
  onVerwijder,
  onTerug,
  terugTekst,
  voortgang,
}: {
  producten: ProductWithDetails[];
  toegevoegd: string[];
  resultaat: PricingResult;
  prijsVerborgen: boolean;
  onAanpassen: (id: string) => void;
  onVerwijder: (id: string) => void;
  onTerug: () => void;
  terugTekst: string;
  voortgang?: React.ReactNode;
}) {
  const rijen = producten.filter((p) => toegevoegd.includes(p.id));
  return (
    <Bewerkbaar doel="overzicht" label="Overzicht">
      <Card>
        <CardContent className="flex flex-col gap-4">
          {voortgang}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">Jouw tuinplan</h3>
            <Button type="button" variant="ghost" size="sm" onClick={onTerug}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {terugTekst}
            </Button>
          </div>
          {rijen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Je hebt nog niets gekozen.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {rijen.map((product) => {
                const o = resultaat.onderdelen.find((x) => x.id === product.id);
                return (
                  <li key={product.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-foreground">
                      <OnderdeelIcoon product={product} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-foreground">{product.naam}</p>
                      {o && o.hoeveelheid > 0 && <p className="text-sm text-muted-foreground">{formatHoeveelheid(o.hoeveelheid, o.eenheid)}</p>}
                    </div>
                    {!prijsVerborgen && <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCenten(onderdeelInclCenten(resultaat, product.id))}</span>}
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label={`${product.naam} aanpassen`} onClick={() => onAanpassen(product.id)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`${product.naam} verwijderen`} onClick={() => onVerwijder(product.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Bewerkbaar>
  );
}
