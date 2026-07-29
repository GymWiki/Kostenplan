import { formatCurrency } from "@/app/lib/format";
import { fontFamilyFor } from "@/app/lib/fonts";
import { regelTotaal, berekenOfferteTotalen, type OfferteRegel } from "@/app/lib/offertes";
import type { Branding } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

// Live weergave van hoe de offerte er met de huisstijl uitziet — zelfde
// kleuren/logo/lettertype-logica als het publieke klantenportaal
// (calculator.tsx), maar dan document-vormig i.p.v. een rekentool. Puur
// visueel, geen eigen state: herrekent bij elke wijziging in de editor mee.
export function OffertePreview({
  bedrijfsnaam,
  klantNaam,
  branding,
  regels,
  introTekst,
  voorwaardenTekst,
  geldigTot,
  btwPercentage,
}: {
  bedrijfsnaam: string;
  klantNaam: string;
  branding: Branding | null;
  regels: OfferteRegel[];
  introTekst: string;
  voorwaardenTekst: string;
  geldigTot: Date | null;
  btwPercentage: number;
}) {
  const primaireKleur = branding?.primaireKleur ?? "#15803d";
  const fontFamily = fontFamilyFor(branding?.lettertype ?? "MODERN");
  const { subtotaal, btw, totaal } = berekenOfferteTotalen(regels, btwPercentage);

  return (
    <div
      className="flex flex-col gap-5 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm"
      style={{ fontFamily }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-lg font-semibold" style={{ color: primaireKleur }}>
          {bedrijfsnaam}
        </p>
        {branding?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- externe Supabase Storage-URL
          <img src={branding.logoUrl} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground">Offerte voor {klantNaam || "…"}</h2>
        {geldigTot && (
          <p className="mt-1 text-xs text-muted-foreground">Geldig tot {dateFormatter.format(geldigTot)}</p>
        )}
      </div>

      {introTekst && <p className="whitespace-pre-wrap text-sm text-foreground">{introTekst}</p>}

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {regels.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nog geen regels.</p>
        ) : (
          regels.map((regel) => (
            <div key={regel.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="text-foreground">{regel.omschrijving || "…"}</p>
                <p className="text-xs text-muted-foreground">
                  {regel.aantal} {regel.eenheid} × {formatCurrency(regel.prijsPerEenheid)}
                </p>
              </div>
              <span className="shrink-0 font-medium text-foreground">{formatCurrency(regelTotaal(regel))}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/40 p-3 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotaal</span>
          <span>{formatCurrency(subtotaal)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Btw ({btwPercentage}%)</span>
          <span>{formatCurrency(btw)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 text-base font-semibold" style={{ color: primaireKleur }}>
          <span>Totaal</span>
          <span>{formatCurrency(totaal)}</span>
        </div>
      </div>

      {voorwaardenTekst && (
        <p className="whitespace-pre-wrap border-t border-border pt-4 text-xs text-muted-foreground">
          {voorwaardenTekst}
        </p>
      )}
    </div>
  );
}
