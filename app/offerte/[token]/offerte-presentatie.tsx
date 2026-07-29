import { formatCurrency } from "@/app/lib/format";
import { brandingFontVariables } from "@/app/lib/fonts";
import { OFFERTE_STATUS_LABELS, berekenOfferteTotalen, regelTotaal, type OfferteRegel } from "@/app/lib/offertes";
import { OfferteReactieForm } from "./offerte-reactie-form";
import type { OfferteStatus } from "@/app/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

// Puur presentationeel (geen data-fetching) zodat dit los van de echte
// database te renderen/testen is — zie page.tsx voor het ophalen en
// afleiden van deze props.
export function OffertePresentatie({
  deelToken,
  bedrijfsnaam,
  klantNaam,
  logoUrl,
  primaireKleur,
  achtergrondKleur,
  fontFamily,
  regels,
  introTekst,
  voorwaardenTekst,
  geldigTot,
  gereageerdOp,
  btwPercentage,
  status,
  contactEmail,
  contactTelefoonnummer,
}: {
  deelToken: string;
  bedrijfsnaam: string;
  klantNaam: string;
  logoUrl: string | null;
  primaireKleur: string;
  achtergrondKleur: string;
  fontFamily: string;
  regels: OfferteRegel[];
  introTekst: string | null;
  voorwaardenTekst: string | null;
  geldigTot: Date;
  gereageerdOp: Date | null;
  btwPercentage: number;
  status: OfferteStatus;
  contactEmail: string | null;
  contactTelefoonnummer: string | null;
}) {
  const { subtotaal, btw, totaal } = berekenOfferteTotalen(regels, btwPercentage);
  const heeftContact = Boolean(contactEmail || contactTelefoonnummer);

  return (
    <div
      className={brandingFontVariables()}
      style={{ fontFamily, backgroundColor: achtergrondKleur, minHeight: "100vh" }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold" style={{ color: primaireKleur }}>
            {bedrijfsnaam}
          </p>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- externe Supabase Storage-URL
            <img src={logoUrl} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold text-foreground">Offerte voor {klantNaam}</h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${primaireKleur}1a`, color: primaireKleur }}
            >
              {OFFERTE_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Geldig tot {dateFormatter.format(geldigTot)}</p>

          {introTekst && <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{introTekst}</p>}

          <div className="mt-5 flex flex-col divide-y divide-border rounded-lg border border-border">
            {regels.map((regel) => (
              <div key={regel.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="text-foreground">{regel.omschrijving}</p>
                  <p className="text-xs text-muted-foreground">
                    {regel.aantal} {regel.eenheid} × {formatCurrency(regel.prijsPerEenheid)}
                  </p>
                </div>
                <span className="shrink-0 font-medium text-foreground">{formatCurrency(regelTotaal(regel))}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 rounded-lg bg-secondary/40 p-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotaal</span>
              <span>{formatCurrency(subtotaal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Btw ({btwPercentage}%)</span>
              <span>{formatCurrency(btw)}</span>
            </div>
            <div
              className="flex items-center justify-between pt-1 text-base font-semibold"
              style={{ color: primaireKleur }}
            >
              <span>Totaal</span>
              <span>{formatCurrency(totaal)}</span>
            </div>
          </div>

          {voorwaardenTekst && (
            <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-xs text-muted-foreground">
              {voorwaardenTekst}
            </p>
          )}

          {heeftContact && (
            <p className="mt-4 text-xs text-muted-foreground">
              Vragen? Neem contact op
              {contactEmail && <> via {contactEmail}</>}
              {contactTelefoonnummer && <> of {contactTelefoonnummer}</>}.
            </p>
          )}
        </div>

        {status === "VERSTUURD" && <OfferteReactieForm deelToken={deelToken} />}

        {status === "GEACCEPTEERD" && (
          <div className="rounded-xl border border-accent bg-accent/50 p-5 text-center text-sm text-accent-foreground">
            Je bent akkoord gegaan met deze offerte
            {gereageerdOp && <> op {dateFormatter.format(gereageerdOp)}</>}. {bedrijfsnaam} neemt contact met je
            op.
          </div>
        )}

        {status === "AFGEWEZEN" && (
          <div className="rounded-xl border border-border bg-secondary/40 p-5 text-center text-sm text-muted-foreground">
            Je hebt aangegeven niet akkoord te gaan met deze offerte.
          </div>
        )}

        {status === "VERLOPEN" && (
          <div className="rounded-xl border border-border bg-secondary/40 p-5 text-center text-sm text-muted-foreground">
            Deze offerte is verlopen. Neem contact op met {bedrijfsnaam} voor een nieuwe offerte.
          </div>
        )}
      </div>
    </div>
  );
}
