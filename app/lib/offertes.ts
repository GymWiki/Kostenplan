import { berekenBtw } from "@/app/lib/money";
import { bouwOfferteUitLead } from "@/app/lib/offerte/uit-lead";
import type { LeadSnapshot } from "@/app/lib/leads";
import { formatCurrency } from "@/app/lib/format";
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

// ---- Weergave van de regels (klantpagina, PDF, dashboard-voorbeeld): één gedeelde functie -------------------------------
//
// Oude offertes die vóór de rekenkern zijn voorgevuld kunnen de vorm hebben "elk onderdeel op € 0,00 + één restpost
// 'Materiaal- en overige kosten' met alles" (zie heeftVerouderdeBerekening). Het totaal daarvan klopt, de weergave niet.
// Voor die offertes wordt de weergave, ZONDER iets op te slaan of te wijzigen, opgebouwd uit de bevroren aanvraag
// (Lead.snapshot) met dezelfde bouwfunctie als een nieuwe offerte, per onderdeel één totaalprijs. Dat gebeurt alleen als
// die opbouw tot op de cent hetzelfde subtotaal geeft als de opgeslagen offerte; anders blijft het bij de opgeslagen
// regels, zonder "€ 0,00" en met een duidelijk benoemde regel voor de kosten die niet per onderdeel te verdelen zijn.
// De totalen (subtotaal, btw, totaal) komen altijd uit de opgeslagen regels, nooit uit deze weergave.
export type WeergaveRegel = {
  id: string;
  omschrijving: string;
  // "10 m¹" of "90 m² × € 40,00" gesplitst, zodat de PDF (kolommen) en de pagina (één regel) dezelfde tekst gebruiken.
  aantalTekst: string;
  prijsTekst: string | null;
  // null = niet bekend (alleen in de terugvaloptie).
  totaal: number | null;
};

export const RESTPOST_OMSCHRIJVING = "Materiaal- en overige kosten";
export const RESTPOST_WEERGAVE_NAAM = "Overige kosten voor bovenstaande onderdelen";

const naarCenten = (euro: number) => Math.round(euro * 100 + (euro >= 0 ? 1e-9 : -1e-9));
const isRestpost = (r: OfferteRegel) => r.id === "snapshot-restant" || r.omschrijving === RESTPOST_OMSCHRIJVING;
const aantalTekstVan = (r: OfferteRegel) => `${r.aantal} ${r.eenheid}`.trim();

export type WeergaveBron = "opgeslagen" | "uit-aanvraag" | "opgeslagen-zonder-uitsplitsing";

export function offerteWeergaveRegels(regels: OfferteRegel[], snapshot?: LeadSnapshot | null): { regels: WeergaveRegel[]; bron: WeergaveBron } {
  const gewoon: WeergaveRegel[] = regels.map((r) => ({ id: r.id, omschrijving: r.omschrijving, aantalTekst: aantalTekstVan(r), prijsTekst: formatCurrency(r.prijsPerEenheid), totaal: regelTotaal(r) }));
  const verouderd = regels.some(isRestpost) && regels.some((r) => !isRestpost(r) && r.aantal > 0 && r.prijsPerEenheid === 0);
  if (!verouderd) return { regels: gewoon, bron: "opgeslagen" };

  const opgeslagenCenten = regels.reduce((som, r) => som + naarCenten(regelTotaal(r)), 0);
  if (snapshot) {
    try {
      const bouw = bouwOfferteUitLead(snapshot);
      const rijen: WeergaveRegel[] = [];
      let som = 0;
      bouw.secties.forEach((sectie, s) => {
        const bedrag = (r: { aantal: number; prijsCenten: number }) => Math.round(r.aantal * r.prijsCenten);
        // Een onderdeel heeft een titel "Naam – hoeveelheid" (of een productId); vaste kosten, minimumtarief en een totalen-sectie niet.
        if (sectie.productId || sectie.titel.includes(" – ")) {
          const [naam, hoeveelheid] = sectie.titel.split(" – ");
          const totaal = sectie.regels.reduce((t, r) => t + bedrag(r), 0);
          som += totaal;
          rijen.push({ id: `uit-aanvraag-${s}`, omschrijving: naam, aantalTekst: hoeveelheid ?? "", prijsTekst: null, totaal: totaal / 100 });
        } else {
          sectie.regels.forEach((r, i) => {
            som += bedrag(r);
            rijen.push({ id: `uit-aanvraag-${s}-${i}`, omschrijving: r.omschrijving, aantalTekst: `${r.aantal} ${r.eenheid}`.trim(), prijsTekst: formatCurrency(r.prijsCenten / 100), totaal: bedrag(r) / 100 });
          });
        }
      });
      if (rijen.length > 0 && som === opgeslagenCenten) return { regels: rijen, bron: "uit-aanvraag" };
    } catch {
      /* terugval hieronder */
    }
  }

  return {
    bron: "opgeslagen-zonder-uitsplitsing",
    regels: regels.map((r) =>
      isRestpost(r)
        ? { id: r.id, omschrijving: RESTPOST_WEERGAVE_NAAM, aantalTekst: "", prijsTekst: null, totaal: regelTotaal(r) }
        : r.aantal > 0 && r.prijsPerEenheid === 0
          ? { id: r.id, omschrijving: r.omschrijving, aantalTekst: aantalTekstVan(r), prijsTekst: null, totaal: null }
          : { id: r.id, omschrijving: r.omschrijving, aantalTekst: aantalTekstVan(r), prijsTekst: formatCurrency(r.prijsPerEenheid), totaal: regelTotaal(r) }
    ),
  };
}

// Zelfde tekst op alle plekken: "10 m¹ × € 236,00" of alleen "10 m¹".
export const weergaveDetail = (r: WeergaveRegel) => (r.prijsTekst ? `${r.aantalTekst} × ${r.prijsTekst}` : r.aantalTekst);

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
