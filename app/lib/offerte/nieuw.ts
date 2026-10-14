import { stelMinimumExactIn } from "./minimum";
import type { Lead } from "@/app/generated/prisma/client";
import type { LeadSnapshot } from "@/app/lib/leads";
import { termijnenVoor, voorwaardenTeksten, type OfferteGegevensWaarden } from "./gegevens";
import { leegAdres, type OfferteAfzender, type OfferteInhoud } from "./model";
import { bouwOfferteUitLead } from "./uit-lead";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function afzenderUit(g: OfferteGegevensWaarden, huisstijl: { kleur: string; lettertype: string }): OfferteAfzender {
  return {
    handelsnaam: g.handelsnaam,
    rechtsvorm: g.rechtsvorm,
    statutaireNaam: g.statutaireNaam,
    statutaireZetel: g.statutaireZetel,
    kvkNummer: g.kvkNummer,
    adresRegel: g.adresRegel,
    postcode: g.postcode,
    plaats: g.plaats,
    btwId: g.btwId,
    korActief: g.korActief,
    korTekst: g.korTekst,
    iban: g.iban,
    ibanTenaamstelling: g.ibanTenaamstelling,
    telefoon: g.telefoon,
    email: g.email,
    website: g.website,
    logoUrl: g.logoUrl,
    contactNaam: g.contactNaam,
    contactFunctie: g.contactFunctie,
    kleur: huisstijl.kleur,
    lettertype: huisstijl.lettertype,
  };
}

// Bouwt de inhoud van een nieuwe offerte (versie 1) uit een lead en de
// offertegegevens/standaarden van het bedrijf.
export function bouwInhoudUitLead({
  nummer,
  lead,
  gegevens,
  huisstijl,
  nu = new Date(),
}: {
  nummer: string;
  lead: Pick<Lead, "id" | "naam" | "email" | "telefoonnummer" | "snapshot">;
  gegevens: OfferteGegevensWaarden;
  huisstijl: { kleur: string; lettertype: string };
  nu?: Date;
}): { inhoud: OfferteInhoud; waarschuwingen: string[] } {
  const bouw = bouwOfferteUitLead(lead.snapshot as unknown as LeadSnapshot, { btwStandaard: gegevens.btwStandaard });
  const geldigTot = new Date(nu);
  geldigTot.setDate(geldigTot.getDate() + gegevens.geldigheidDagen);
  const inhoud: OfferteInhoud = {
    nummer,
    versie: 1,
    datum: iso(nu),
    geldigTot: iso(geldigTot),
    afzender: afzenderUit(gegevens, huisstijl),
    klant: { type: "particulier", naam: lead.naam, bedrijfsnaam: "", adres: leegAdres(), email: lead.email, telefoon: lead.telefoonnummer ?? "" },
    projectadresGelijk: true,
    projectadres: leegAdres(),
    onderwerp: bouw.onderwerp,
    introductie: gegevens.introTekst,
    secties: bouw.secties,
    voorwaarden: voorwaardenTeksten(gegevens.voorwaardenBlokken),
    herroeping: { aan: true, tekst: gegevens.herroepingTekst },
    betaaltermijnen: termijnenVoor(gegevens.betaalPreset, gegevens.betaalTermijnen),
    planning: { startweek: "", doorlooptijd: "" },
    bijlagen: gegevens.voorwaardenPdfUrl ? [{ naam: gegevens.voorwaardenPdfNaam || "Algemene voorwaarden.pdf", url: gegevens.voorwaardenPdfUrl }] : [],
    slottekst: gegevens.slotTekst,
    rekenregel: 3,
    bron: { leadId: lead.id, totaalRekentoolInclCenten: bouw.totaalRekentoolInclCenten, bandbreedte: bouw.bandbreedte || undefined, waarschuwingen: bouw.waarschuwingen.length > 0 ? bouw.waarschuwingen : undefined },
  };
  return { inhoud: stelMinimumExactIn(inhoud, bouw.minimumInclCenten ?? 0), waarschuwingen: bouw.waarschuwingen };
}
