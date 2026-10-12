import { berekenBtw } from "@/app/lib/money";
import { bouwOfferteUitLead } from "@/app/lib/offerte/uit-lead";
import type { LeadSnapshot } from "@/app/lib/leads";
import type { OfferteStatus } from "@/app/generated/prisma/client";

// Eén regel in Offerte.regels (Json) — vrij bewerkbaar, los van de
// oorspronkelijke berekening zodra het concept is aangemaakt. `totaal` wordt
// bewust nooit opgeslagen: altijd aantal * prijsPerEenheid, zie regelTotaal().
export type OfferteRegel = {
  id: string;
  omschrijving: string;
  aantal: number;
  eenheid: string;
  prijsPerEenheid: number;
};

export const OFFERTE_STATUS_LABELS: Record<OfferteStatus, string> = {
  CONCEPT: "Concept",
  VERSTUURD: "Verstuurd",
  GEACCEPTEERD: "Geaccepteerd",
  AFGEWEZEN: "Afgewezen",
  VERLOPEN: "Verlopen",
  INGETROKKEN: "Ingetrokken",
};

export function regelTotaal(regel: OfferteRegel) {
  return regel.aantal * regel.prijsPerEenheid;
}

export function offerteSubtotaal(regels: OfferteRegel[]) {
  return regels.reduce((som, regel) => som + regelTotaal(regel), 0);
}

export function berekenOfferteTotalen(regels: OfferteRegel[], btwPercentage: number) {
  const subtotaal = offerteSubtotaal(regels);
  const btw = berekenBtw(subtotaal, btwPercentage);
  return { subtotaal, btw, totaal: subtotaal + btw };
}

// Vult een nieuw (oud type) offerteconcept uit de bevroren aanvraag-snapshot, met dezelfde regels als de
// nieuwe offerte: per onderdeel losse regels voor elke materiaalcategorie, arbeid, extra's, transport en
// voorrijkosten, elk met de echte prijs per eenheid. Nooit een regel op €0 en nooit een restpost: de som
// van de regels is het subtotaal uit de rekenkern. De bouwlogica staat in app/lib/offerte/uit-lead.ts.
export function prefillOfferteRegels(snapshot: LeadSnapshot): OfferteRegel[] {
  const bouw = bouwOfferteUitLead(snapshot);
  return bouw.secties.flatMap((sectie, s) =>
    sectie.regels.map((r, i) => ({
      id: `snapshot-${s}-${i}`,
      omschrijving: bouw.secties.length > 1 && sectie.productId ? `${r.omschrijving} (${sectie.titel.split(" – ")[0]})` : r.omschrijving,
      aantal: r.aantal,
      eenheid: r.eenheid,
      prijsPerEenheid: r.prijsCenten / 100,
    }))
  );
}

// Signaleert een concept dat is voorgevuld tegen een aanvraag-snapshot van
// vóór de fix waarbij elk productregel zijn eigen prijs kreeg (of tegen een
// snapshot die om een andere reden geen prijs per regel kon geven) — te
// herkennen aan het vaste "snapshot-restant"-id dat prefillOfferteRegels()
// hierboven alleen zet als vangnet. Bewust géén generieke "wijkt af van wat
// prefillOfferteRegels nu zou opleveren"-vergelijking: regels zijn na
// aanmaken vrij bewerkbaar (zie OfferteRegel hierboven), dus zo'n check zou
// ook op elke handmatige aanpassing van de vakman afgaan. Alleen relevant
// voor CONCEPT — zie herberekenOfferteAction in app/lib/actions/offertes.ts,
// die hier bewust nooit een VERSTUURD/definitieve offerte mee aanpast.
export function heeftVerouderdeBerekening(regels: OfferteRegel[]): boolean {
  return regels.some((regel) => regel.id === "snapshot-restant");
}

// Controles vlak vóór versturen (zie de verzend-bevestiging in
// offerte-editor.tsx en de server-side achtervang in genereerDeelLinkAction).
// Eén blokkerende controle (ontbrekend e-mailadres) — versturen is dan
// onmogelijk, geen "toch doorgaan"-optie. De rest zijn waarschuwingen die de
// vakman bewust moet zien voordat hij toch verstuurt.
export type VerzendControle = {
  type: "emailOntbreekt" | "nulPrijsRegels" | "totaalIsNul" | "geldigTotVerlopen";
  bericht: string;
};

export function berekenVerzendControles({
  klantEmail,
  regels,
  totaal,
  geldigTot,
}: {
  klantEmail: string;
  regels: OfferteRegel[];
  totaal: number;
  geldigTot: Date;
}): { blokkerend: VerzendControle[]; waarschuwingen: VerzendControle[] } {
  const blokkerend: VerzendControle[] = [];
  const waarschuwingen: VerzendControle[] = [];

  if (!klantEmail.trim()) {
    blokkerend.push({
      type: "emailOntbreekt",
      bericht: "De klant heeft geen e-mailadres — versturen is niet mogelijk.",
    });
  }

  const nulPrijsRegels = regels.filter((regel) => regel.aantal > 0 && regel.prijsPerEenheid === 0);
  if (nulPrijsRegels.length > 0) {
    waarschuwingen.push({
      type: "nulPrijsRegels",
      bericht:
        nulPrijsRegels.length === 1
          ? `1 regel heeft een aantal groter dan 0 maar een prijs van €0,00 ("${nulPrijsRegels[0].omschrijving || "Zonder omschrijving"}").`
          : `${nulPrijsRegels.length} regels hebben een aantal groter dan 0 maar een prijs van €0,00.`,
    });
  }

  if (totaal === 0) {
    waarschuwingen.push({ type: "totaalIsNul", bericht: "Het totaalbedrag van deze offerte is €0,00." });
  }

  const vandaag = new Date();
  vandaag.setHours(0, 0, 0, 0);
  if (geldigTot.getTime() < vandaag.getTime()) {
    waarschuwingen.push({ type: "geldigTotVerlopen", bericht: "De \"geldig tot\"-datum ligt al in het verleden." });
  }

  return { blokkerend, waarschuwingen };
}

// Lazy weergave-status: VERSTUURD + geldigTot verstreken telt overal als
// Verlopen, zonder dat elke leeslocatie (kanban-kaart, lijst) daarvoor een
// database-schrijving hoeft te doen. De daadwerkelijke rij wordt pas
// bijgewerkt op de momenten die er echt toe doen — zie syncOfferteVerval in
// app/lib/actions/offertes.ts.
export function weergaveOfferteStatus(offerte: { status: OfferteStatus; geldigTot: Date }): OfferteStatus {
  if (offerte.status === "VERSTUURD" && offerte.geldigTot.getTime() < Date.now()) {
    return "VERLOPEN";
  }
  return offerte.status;
}
