"use client";

import { MapPin, Phone, Mail, TriangleAlert, Info } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { AdresZoeker } from "@/app/components/werkgebied/adres-zoeker";
import { adresRegel, adresIsKlaar, type AdresKeuze } from "@/app/lib/werkgebied/adres-invoer";

// De eerste vraag van een rekentool met werkgebied: waar moet het werk gebeuren? Vóór het rekenen, zodat de klant
// meteen weet of hij in het gebied valt. Het adres gaat daarna mee naar het aanvraagformulier.
export function AdresVraag({ keuze, onKeuze, className }: { keuze: AdresKeuze; onKeuze: (k: AdresKeuze) => void; className?: string }) {
  const status =
    keuze.soort === "gevonden"
      ? { soort: "ok" as const, tekst: adresRegel({ straat: keuze.adres.straat, huisnummer: keuze.adres.huisnummer, postcode: keuze.adres.postcode, plaats: keuze.adres.plaats }) }
      : keuze.soort === "onbekend"
        ? { soort: "fout" as const, tekst: "We kunnen dit adres niet vinden. Controleer je postcode en huisnummer." }
        : keuze.soort === "niet-gecontroleerd"
          ? { soort: "let-op" as const, tekst: "We kunnen je adres nu niet controleren, maar je kunt gewoon doorgaan." }
          : null;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2">
        <label htmlFor="wg-adres" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MapPin className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
          Wat is je postcode en huisnummer?
        </label>
        <p className="text-sm text-muted-foreground">Dan weten we meteen of we bij jou in de buurt werken. Je hoeft je adres straks niet opnieuw in te vullen.</p>
        <AdresZoeker id="wg-adres" onKeuze={onKeuze} />
        {status && (
          <p role={status.soort === "fout" ? "alert" : "status"} className={status.soort === "fout" ? "text-sm font-medium text-destructive" : status.soort === "let-op" ? "text-sm text-warning" : "text-sm font-medium text-foreground"}>
            {status.soort === "ok" ? "✓ " : ""}
            {status.tekst}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { adresIsKlaar };

// Een melding over het werkgebied of het minimum, met (als de hovenier ze toont) de contactgegevens. Geen pop-up: gewoon in de pagina.
export function LocatieBericht({
  tekst,
  contact,
  soort = "info",
  className,
}: {
  tekst: string;
  contact?: { telefoonnummer: string | null; email: string | null };
  soort?: "info" | "blokkade";
  className?: string;
}) {
  const heeftContact = Boolean(contact?.telefoonnummer || contact?.email);
  const Icoon = soort === "blokkade" ? TriangleAlert : Info;
  return (
    <div role="status" className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm ${soort === "blokkade" ? "border-warning/50 bg-warning/10" : "border-border bg-secondary/50"} ${className ?? ""}`}>
      <p className="flex items-start gap-2 text-foreground">
        <Icoon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{tekst}</span>
      </p>
      {heeftContact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 font-semibold text-foreground">
          {contact?.telefoonnummer && (
            <a href={`tel:${contact.telefoonnummer.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 underline">
              <Phone className="h-4 w-4" aria-hidden="true" /> {contact.telefoonnummer}
            </a>
          )}
          {contact?.email && (
            <a href={`mailto:${contact.email}`} className="inline-flex min-h-11 items-center gap-1.5 underline">
              <Mail className="h-4 w-4" aria-hidden="true" /> {contact.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
