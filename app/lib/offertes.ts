import { unitLabel } from "@/app/lib/units";
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
};

export function regelTotaal(regel: OfferteRegel) {
  return regel.aantal * regel.prijsPerEenheid;
}

export function offerteSubtotaal(regels: OfferteRegel[]) {
  return regels.reduce((som, regel) => som + regelTotaal(regel), 0);
}

export function berekenOfferteTotalen(regels: OfferteRegel[], btwPercentage: number) {
  const subtotaal = offerteSubtotaal(regels);
  const btw = subtotaal * (btwPercentage / 100);
  return { subtotaal, btw, totaal: subtotaal + btw };
}

// Vult een nieuw offerteconcept met één regel per item uit de bevroren
// aanvraag-snapshot. Elke regel krijgt zijn eigen, al berekende prijs (zie
// LeadSnapshotLine.prijs in app/lib/leads.ts — het volledige, onafhankelijk
// per product berekende bedrag uit calculate.ts). Het restant (subtotaal
// minus de som van alle regels) hoort er normaal gesproken niet meer te
// zijn — die blijft alleen als vangnet staan voor het zeldzame geval dat een
// regel toch geen prijs heeft (bijv. een oudere, vóór deze fix bevroren
// snapshot) of voor een centverschil door afronding, in plaats van geld
// stilzwijgend te laten verdwijnen.
export function prefillOfferteRegels(snapshot: LeadSnapshot): OfferteRegel[] {
  const regels: OfferteRegel[] = snapshot.regels.map((lijn, i) => {
    const aantal = lijn.aantal ?? 1;
    const details = [
      lijn.materiaal,
      lijn.extras && lijn.extras.length > 0 ? lijn.extras.join(", ") : null,
    ].filter(Boolean);
    return {
      id: `snapshot-${i}`,
      omschrijving: details.length > 0 ? `${lijn.naam} (${details.join(", ")})` : lijn.naam,
      aantal,
      eenheid: lijn.eenheid ? unitLabel(lijn.eenheid) : "stuk",
      prijsPerEenheid: lijn.prijs != null && aantal > 0 ? lijn.prijs / aantal : 0,
    };
  });

  const bekendTotaal = offerteSubtotaal(regels);
  const restant = Math.round((snapshot.subtotaal - bekendTotaal) * 100) / 100;
  if (restant > 0.01) {
    regels.push({
      id: "snapshot-restant",
      omschrijving: "Materiaal- en overige kosten",
      aantal: 1,
      eenheid: "post",
      prijsPerEenheid: restant,
    });
  }

  return regels;
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
