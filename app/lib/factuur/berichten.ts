import { formatCents, formatDatum } from "@/app/lib/offerte/weergave";
import type { FactuurInhoud } from "./model";

// Berichten bij het delen van een factuur (eigen mail, deelmenu of WhatsApp). {naam} {nummer} {totaal} {vervaldatum}
// {handelsnaam} {contactNaam} {link} {iban}. Alleen platte tekst; de hovenier ziet en wijzigt het altijd nog voor het verzenden.
export const STANDAARD_FACTUURTEKST = `Beste {naam},

Hierbij ontvangt u factuur {nummer} van {handelsnaam}, voor een bedrag van {totaal}. Wilt u dit vóór {vervaldatum} overmaken op {iban} onder vermelding van {nummer}?

U kunt de factuur hier bekijken en als PDF downloaden: {link}

Heeft u een vraag over de factuur? Neem gerust contact met ons op.

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

export const STANDAARD_CREDITTEKST = `Beste {naam},

Hierbij ontvangt u creditnota {nummer} van {handelsnaam}, ter correctie van een eerdere factuur. Het bedrag van {totaal} wordt met u verrekend.

U kunt de creditnota hier bekijken: {link}

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

// Herinnering (vriendelijk), aanmaning (strenger) en de laatste herinnering voor particulieren (14 dagen, vóór incassokosten).
export const STANDAARD_HERINNERING = `Beste {naam},

Volgens onze administratie hebben wij van u nog geen betaling ontvangen voor factuur {nummer} van {totaal}, met vervaldatum {vervaldatum}. Het kan zijn dat u de betaling al heeft gedaan; dan kunt u dit bericht negeren.

Wilt u het openstaande bedrag overmaken op {iban} onder vermelding van {nummer}? De factuur vindt u hier: {link}

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

export const STANDAARD_AANMANING = `Beste {naam},

Ondanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {nummer} van {totaal} (vervaldatum {vervaldatum}). Wij verzoeken u dringend het openstaande bedrag binnen 7 dagen over te maken op {iban} onder vermelding van {nummer}.

De factuur vindt u hier: {link}

Heeft u de betaling inmiddels gedaan, dan kunt u dit bericht als niet verzonden beschouwen. Is er een reden voor het uitblijven van de betaling? Laat het ons dan weten, dan zoeken we samen naar een oplossing.

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

// TODO(Pieter): tekst juridisch laten checken (14-dagenbrief voor consumenten vóór incassokosten, art. 6:96 BW).
export const STANDAARD_LAATSTE_HERINNERING = `Beste {naam},

Wij hebben nog geen betaling ontvangen voor factuur {nummer} van {totaal} (vervaldatum {vervaldatum}). Dit is een laatste herinnering: wij verzoeken u het openstaande bedrag binnen 14 dagen na ontvangst van dit bericht over te maken op {iban} onder vermelding van {nummer}.

Betaalt u niet binnen deze termijn, dan zijn wij genoodzaakt wettelijke incassokosten en rente in rekening te brengen, en kunnen wij de vordering uit handen geven.

De factuur vindt u hier: {link}

Met vriendelijke groet,
{contactNaam}
{handelsnaam}`;

export type BerichtSoort = "factuur" | "creditnota" | "herinnering" | "aanmaning" | "laatste-herinnering";

export function bouwFactuurBericht(i: { inhoud: FactuurInhoud; totaalInclCenten: number; link: string; soort: BerichtSoort; sjabloon?: string }): { onderwerp: string; tekst: string } {
  const a = i.inhoud.afzender;
  const f = i.inhoud.factuur;
  const standaard = { factuur: STANDAARD_FACTUURTEKST, creditnota: STANDAARD_CREDITTEKST, herinnering: STANDAARD_HERINNERING, aanmaning: STANDAARD_AANMANING, "laatste-herinnering": STANDAARD_LAATSTE_HERINNERING }[i.soort];
  const sjabloon = i.soort === "factuur" && i.sjabloon?.trim() ? i.sjabloon : standaard;
  const waarden: Record<string, string> = {
    naam: i.inhoud.klant.naam.trim() || i.inhoud.klant.bedrijfsnaam.trim() || "heer/mevrouw",
    nummer: f.nummer ?? "(nog geen nummer)",
    totaal: formatCents(Math.abs(i.totaalInclCenten)),
    vervaldatum: formatDatum(f.vervaldatum),
    handelsnaam: a.handelsnaam,
    contactNaam: a.contactNaam || a.handelsnaam,
    link: i.link,
    iban: a.iban,
  };
  const tekst = sjabloon.replace(/\{(\w+)\}/g, (m, k: string) => waarden[k] ?? m);
  const voor = { factuur: "Factuur", creditnota: "Creditnota", herinnering: "Betalingsherinnering factuur", aanmaning: "Aanmaning factuur", "laatste-herinnering": "Laatste herinnering factuur" }[i.soort];
  return { onderwerp: `${voor} ${f.nummer ?? ""} – ${a.handelsnaam}`.replace(/\s+/g, " ").trim(), tekst };
}
