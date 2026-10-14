import { isGeldigBtwId, isGeldigIban, isGeldigKvk, isGeldigEmail } from "@/app/lib/offerte/validatie";
import { vandaagAmsterdam } from "@/app/lib/offerte/status";
import { heeftStatutaireGegevens } from "@/app/lib/offerte/gegevens";
import { factuurTotalen } from "./totalen";
import type { FactuurInhoud } from "./model";

// "Definitief maken": wat moet kloppen voordat een factuur een nummer krijgt. Blokkerend = definitief maken kan niet;
// waarschuwing = de hovenier moet het gezien hebben. Wordt ook server-side herhaald (de database-opslag draait deze
// controle altijd, ook bij een directe aanroep).
export type FactuurControlePunt = { id: string; bericht: string; href?: string };
export type FactuurControle = { blokkerend: FactuurControlePunt[]; waarschuwingen: FactuurControlePunt[] };

const BEDRIJFSGEGEVENS = "/dashboard/profiel/bedrijfsgegevens";
const veld = (v: string) => `${BEDRIJFSGEGEVENS}#og-${v}`;
const leeg = (s: string | undefined | null) => !s || s.trim() === "";

// Uiterlijk op de 15e dag van de maand na de uitvoering moet de factuur verstuurd zijn (art. 35a Wet OB).
export function uiterlijkVersturen(uitvoeringsdatum: string): string {
  const [j, m] = uitvoeringsdatum.slice(0, 10).split("-").map(Number);
  const volgendeMaand = m === 12 ? new Date(Date.UTC(j + 1, 0, 15)) : new Date(Date.UTC(j, m, 15));
  return volgendeMaand.toISOString().slice(0, 10);
}

export function termijnWaarschuwing(uitvoeringsdatum: string, nu: Date = new Date()): { soort: "te-laat" | "dreigt"; uiterlijk: string; dagen: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(uitvoeringsdatum)) return null;
  const uiterlijk = uiterlijkVersturen(uitvoeringsdatum);
  const dagen = Math.round((Date.parse(`${uiterlijk}T00:00:00Z`) - Date.parse(`${vandaagAmsterdam(nu)}T00:00:00Z`)) / 86_400_000);
  if (dagen < 0) return { soort: "te-laat", uiterlijk, dagen };
  if (dagen <= 7) return { soort: "dreigt", uiterlijk, dagen };
  return null;
}

export function controleerFactuur(inhoud: FactuurInhoud, nu: Date = new Date()): FactuurControle {
  const blokkerend: FactuurControlePunt[] = [];
  const waarschuwingen: FactuurControlePunt[] = [];
  const a = inhoud.afzender;
  const f = inhoud.factuur;

  if (leeg(a.handelsnaam)) blokkerend.push({ id: "handelsnaam", bericht: "De handelsnaam van je bedrijf ontbreekt.", href: veld("handelsnaam") });
  if (!isGeldigKvk(a.kvkNummer || "")) blokkerend.push({ id: "kvk", bericht: "Het KvK-nummer ontbreekt of klopt niet (8 cijfers).", href: veld("kvkNummer") });
  if (heeftStatutaireGegevens(a.rechtsvorm) && leeg(a.statutaireZetel)) blokkerend.push({ id: "zetel", bericht: "De statutaire zetel ontbreekt.", href: veld("statutaireZetel") });
  if (!a.korActief && !isGeldigBtwId(a.btwId || "")) blokkerend.push({ id: "btwid", bericht: "Je btw-id ontbreekt (of zet de kleineondernemersregeling aan).", href: veld("btwId") });
  if (leeg(a.adresRegel) || leeg(a.postcode) || leeg(a.plaats)) blokkerend.push({ id: "adres", bericht: "Het vestigingsadres van je bedrijf ontbreekt (straat, postcode en plaats).", href: veld("adresRegel") });
  if (!isGeldigIban(a.iban || "")) blokkerend.push({ id: "iban", bericht: "Je IBAN ontbreekt of klopt niet.", href: veld("iban") });

  if (leeg(inhoud.klant.naam) && leeg(inhoud.klant.bedrijfsnaam)) blokkerend.push({ id: "klant", bericht: "De naam van de klant ontbreekt." });
  if (leeg(inhoud.klant.adres.straat) || leeg(inhoud.klant.adres.postcode) || leeg(inhoud.klant.adres.plaats)) blokkerend.push({ id: "klantadres", bericht: "Het adres van de klant ontbreekt (straat, postcode en plaats). Een postbus alleen is niet genoeg." });

  if (f.btwModus === "verlegd") {
    if (inhoud.klant.type !== "zakelijk") blokkerend.push({ id: "verlegd-klant", bericht: "Btw verlegd kan alleen bij een zakelijke klant." });
    if (!isGeldigBtwId(f.klantBtwId || "")) blokkerend.push({ id: "verlegd-btwid", bericht: "Bij btw verlegd is het btw-id van de klant verplicht (formaat NL123456789B01)." });
    if (a.korActief) blokkerend.push({ id: "verlegd-kor", bericht: "Je gebruikt de kleineondernemersregeling: dan is er geen btw en is verleggen niet nodig." });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.factuurdatum)) blokkerend.push({ id: "datum", bericht: "De factuurdatum ontbreekt." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.uitvoeringVan)) {
    blokkerend.push({ id: "uitvoering", bericht: f.soort === "termijn" ? "Vul de datum van de vooruitbetaling (of uitvoering) in." : "Vul de uitvoeringsdatum van het werk in." });
  } else if (f.uitvoeringTot && f.uitvoeringTot < f.uitvoeringVan) {
    blokkerend.push({ id: "uitvoering-periode", bericht: "De einddatum van de uitvoering ligt vóór de begindatum." });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.factuurdatum) && f.vervaldatum && f.vervaldatum < f.factuurdatum) blokkerend.push({ id: "vervaldatum", bericht: "De vervaldatum ligt vóór de factuurdatum." });

  const regels = inhoud.secties.flatMap((s) => s.regels).filter((r) => r.type !== "tekst");
  if (regels.length === 0) blokkerend.push({ id: "geenregels", bericht: "Er is nog geen regel met een bedrag." });
  const open = regels.filter((r) => r.label === "stelpost-open");
  if (open.length > 0) blokkerend.push({ id: "stelpost", bericht: open.length === 1 ? `De stelpost "${open[0].omschrijving || "zonder omschrijving"}" heeft nog geen werkelijke hoeveelheid. Open de regel en vul de werkelijke hoeveelheid in, of kies "Hoeveelheid klopt".` : `${open.length} stelposten hebben nog geen werkelijke hoeveelheid. Open elke stelpost en vul de werkelijke hoeveelheid in, of kies "Hoeveelheid klopt".` });
  const nul = regels.filter((r) => r.label !== "stelpost-open" && Math.round(r.aantal * r.prijsCenten) === 0);
  if (nul.length > 0) blokkerend.push({ id: "nulregels", bericht: nul.length === 1 ? `De regel "${nul[0].omschrijving || "zonder omschrijving"}" heeft een bedrag van €0. Vul een prijs in of verwijder de regel.` : `${nul.length} regels hebben een bedrag van €0. Vul een prijs in of verwijder ze.` });

  const t = factuurTotalen(inhoud);
  if (regels.length > 0 && f.soort === "creditnota" && t.totaalIncl >= 0) blokkerend.push({ id: "credit-negatief", bericht: "Een creditnota heeft een negatief totaal." });
  if (regels.length > 0 && f.soort !== "creditnota" && t.totaalIncl < 0) blokkerend.push({ id: "negatief", bericht: "Het totaal van een factuur kan niet negatief zijn. Maak een creditnota." });
  if (f.soort === "creditnota" && !f.creditVoor) blokkerend.push({ id: "credit-verwijzing", bericht: "Een creditnota verwijst naar de oorspronkelijke factuur." });

  if (leeg(inhoud.klant.email) ? false : !isGeldigEmail(inhoud.klant.email)) waarschuwingen.push({ id: "klantmail", bericht: "Het e-mailadres van de klant lijkt niet te kloppen." });
  if (leeg(a.telefoon) || leeg(a.email)) waarschuwingen.push({ id: "contact", bericht: "Telefoon of e-mailadres van je bedrijf ontbreekt.", href: veld(leeg(a.telefoon) ? "telefoon" : "email") });
  const tw = termijnWaarschuwing(f.uitvoeringTot || f.uitvoeringVan, nu);
  if (tw) waarschuwingen.push({ id: "termijn", bericht: tw.soort === "te-laat" ? `Een factuur moet uiterlijk op de 15e van de maand na de uitvoering verstuurd zijn (hier: ${tw.uiterlijk}). Die datum is voorbij: verstuur hem zo snel mogelijk.` : `Een factuur moet uiterlijk op ${tw.uiterlijk} verstuurd zijn (15e van de maand na de uitvoering): nog ${tw.dagen} ${tw.dagen === 1 ? "dag" : "dagen"}.` });
  return { blokkerend, waarschuwingen };
}
