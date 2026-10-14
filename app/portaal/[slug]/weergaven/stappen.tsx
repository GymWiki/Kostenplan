"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { cn } from "@/app/lib/cn";
import type { PricingResult } from "@/app/lib/pricing/engine";
import { formatCenten } from "@/app/lib/pricing/format";
import { onderdeelIsGeldig } from "@/app/lib/weergave/bedragen";
import type { WeergaveConfig } from "@/app/lib/weergave/config";
import { Bewerkbaar } from "../bewerkbaar";
import type { ProductWithDetails } from "../calculator";
import { MERKKNOP, OnderdeelIcoon, Vinkje, type Configurator } from "./gedeeld";

export function StappenVoortgang({ stap, totaal, label }: { stap: number; totaal: number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-muted-foreground">
        Stap {stap} van {totaal} <span className="sr-only">: {label}</span>
      </p>
      <div role="progressbar" aria-label="Voortgang" aria-valuemin={1} aria-valuemax={totaal} aria-valuenow={stap} aria-valuetext={`Stap ${stap} van ${totaal}: ${label}`} className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] motion-reduce:transition-none" style={{ width: `${(stap / totaal) * 100}%` }} />
      </div>
    </div>
  );
}

// "Stappen": 1) kies de onderdelen, 2…n) per gekozen onderdeel één scherm, daarna het overzicht (gedeeld met tegels).
// De stap zelf is de volgorde van de gekozen onderdelen; `stap` 0 is het kiezen.
export function StappenWeergave({
  producten,
  gekozen,
  stap,
  onStap,
  onToggle,
  resultaat,
  vanaf,
  prijsVerborgen,
  totaalCenten,
  wc,
  configurator,
  onKlaar,
}: {
  producten: ProductWithDetails[];
  gekozen: string[];
  stap: number;
  onStap: (stap: number) => void;
  onToggle: (id: string) => void;
  resultaat: PricingResult;
  vanaf: Record<string, number | null>;
  prijsVerborgen: boolean;
  totaalCenten: number | null;
  wc: WeergaveConfig;
  configurator: Configurator;
  onKlaar: () => void;
}) {
  const volgorde = producten.filter((p) => gekozen.includes(p.id));
  const totaalStappen = 1 + volgorde.length + 1;
  const huidig = stap === 0 ? null : volgorde[stap - 1] ?? null;
  const geldig = stap === 0 ? volgorde.length > 0 : huidig ? onderdeelIsGeldig(resultaat, huidig.id) : false;
  const laatste = volgorde.length > 0 && stap >= volgorde.length;
  const label = stap === 0 ? "Kies je onderdelen" : huidig?.naam ?? "";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <StappenVoortgang stap={Math.min(stap + 1, totaalStappen)} totaal={totaalStappen} label={label} />
        {totaalCenten !== null && !prijsVerborgen && volgorde.length > 0 && (
          <p aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
            Tot nu toe: <strong className="text-foreground">{formatCenten(totaalCenten)}</strong> incl. btw
          </p>
        )}

        {stap === 0 ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-lg font-semibold text-foreground">{wc.kop}</legend>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {producten.map((product) => {
                const aan = gekozen.includes(product.id);
                const v = vanaf[product.id];
                const tekst = wc.onderdelen[product.id]?.tegelTekst || (v != null && !prijsVerborgen ? `vanaf ${formatCenten(v)}` : "");
                return (
                  <li key={product.id} className="flex">
                    <Bewerkbaar doel={`werkzaamheid:${product.id}`} label={product.naam} verplaatsbaar className="flex w-full">
                      <button
                        type="button"
                        aria-pressed={aan}
                        onClick={() => onToggle(product.id)}
                        className={cn(
                          "flex min-h-[7.5rem] w-full cursor-pointer flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4",
                          aan ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-border bg-card hover:border-[var(--brand-primary)]/50 hover:bg-secondary/50"
                        )}
                      >
                        <span className="flex w-full items-start justify-between gap-2">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-foreground">
                            <OnderdeelIcoon product={product} className="h-6 w-6" />
                          </span>
                          {aan && <Vinkje />}
                        </span>
                        <span className="min-w-0 break-words font-semibold text-foreground">{product.naam}</span>
                        {tekst && <span className="mt-auto text-sm tabular-nums text-muted-foreground">{tekst}</span>}
                      </button>
                    </Bewerkbaar>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : huidig ? (
          <Bewerkbaar doel={`werkzaamheid:${huidig.id}`} label={huidig.naam}>
            <section aria-label={huidig.naam}>{configurator(huidig, { prijsVerborgen })}</section>
          </Bewerkbaar>
        ) : null}

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6">
          <Button type="button" variant="ghost" size="lg" onClick={() => onStap(stap - 1)} disabled={stap === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Terug
          </Button>
          <Button type="button" size="lg" className={MERKKNOP} disabled={!geldig} onClick={() => (laatste ? onKlaar() : onStap(stap + 1))}>
            {laatste ? "Bekijk overzicht" : "Volgende"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
