import type { LeadSnapshot, LeadSnapshotLine } from "@/app/lib/leads";
import { unitLabel } from "@/app/lib/units";
import { btwVoorSoort, isPlantenNaam, type RegelSoort } from "./btw-config";
import { nieuwId, type OfferteRegel, type OfferteSectie } from "./model";

// Zet een lead (bevroren berekening uit de rekentool) om in secties en losse
// offerteregels, met de échte prijzen: materiaal (aantal × prijs per eenheid),
// arbeid (tijd × tarief), transport, voorrijkosten en extra's. Nooit een regel
// op €0 en nooit een restpost. Bedragen in centen.

export type BouwOpties = {
  btwStandaard?: Partial<Record<RegelSoort, number>> | null;
};

export type OfferteBouwResultaat = {
  secties: OfferteSectie[];
  onderwerp: string;
  // Totaal dat de klant in de rekentool zag, incl. btw, in centen.
  totaalRekentoolInclCenten: number;
  // Meldingen voor de hovenier (geschatte prijzen, bandbreedte).
  waarschuwingen: string[];
  bandbreedte: boolean;
};

const cent = (euro: number) => Math.round(euro * 100 + 1e-9);
const rond4 = (n: number) => Math.round(n * 10000) / 10000;

function regel(r: Partial<OfferteRegel> & Pick<OfferteRegel, "omschrijving" | "aantal" | "eenheid" | "prijsCenten" | "soort">, opties: BouwOpties, btwFallback: number): OfferteRegel {
  const metSoortBtw = btwVoorSoort(r.soort, opties.btwStandaard ?? undefined);
  // Staat de btw van de rekentool op iets anders dan 21% en is er geen eigen
  // instelling, dan volgt de offerte de rekentool (zo blijft het totaal gelijk).
  const eigen = opties.btwStandaard?.[r.soort];
  const btw = typeof eigen === "number" ? eigen : r.soort === "planten" ? metSoortBtw : btwFallback;
  return { id: nieuwId(), type: "normaal", btw, ...r };
}

function onderwerpVoor(namen: string[]): string {
  const uniek = [...new Set(namen.filter(Boolean))];
  if (uniek.length === 0) return "Offerte";
  if (uniek.length === 1) return uniek[0];
  if (uniek.length === 2) return `${uniek[0]} en ${uniek[1].charAt(0).toLowerCase()}${uniek[1].slice(1)}`;
  return `${uniek.slice(0, -1).join(", ")} en ${uniek[uniek.length - 1].charAt(0).toLowerCase()}${uniek[uniek.length - 1].slice(1)}`;
}

const aantalTekst = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ","));

export function bouwOfferteUitLead(snapshot: LeadSnapshot, opties: BouwOpties = {}): OfferteBouwResultaat {
  const waarschuwingen: string[] = [];
  const btwFallback = snapshot.btwPercentage ?? (snapshot.subtotaal > 0 ? Math.round((snapshot.btw / snapshot.subtotaal) * 100) : 21);
  const secties: OfferteSectie[] = [];
  const vasteTransport: { bedrag: number; n: number } = { bedrag: 0, n: 0 };
  const vasteVoorrij: { bedrag: number; n: number } = { bedrag: 0, n: 0 };

  // Onderdelen zonder bekend bedrag krijgen een gelijk deel van wat niet is toegewezen.
  const metPrijs = snapshot.regels.filter((l) => l.prijs != null && l.prijs > 0);
  const zonderPrijs = snapshot.regels.filter((l) => !(l.prijs != null && l.prijs > 0));
  const toegewezen = metPrijs.reduce((s, l) => s + (l.prijs ?? 0), 0);
  const restPerRegel = zonderPrijs.length > 0 ? Math.max(0, (snapshot.subtotaal - toegewezen) / zonderPrijs.length) : 0;

  for (const lijn of snapshot.regels) {
    const aantal = lijn.aantal != null && lijn.aantal > 0 ? lijn.aantal : 1;
    const eenheid = lijn.eenheid ? unitLabel(lijn.eenheid) : "stuk";
    const titel = lijn.aantal != null && lijn.aantal > 0 && lijn.eenheid ? `${lijn.naam} – ${aantalTekst(lijn.aantal)} ${eenheid}` : lijn.naam;
    const plant = isPlantenNaam(lijn.naam);
    const ob = lijn.opbouw;
    const regels: OfferteRegel[] = [];

    if (ob && (ob.materiaal?.length || ob.arbeid || ob.artikelen || ob.extras?.length || ob.transport || ob.voorrijkosten)) {
      for (const m of ob.materiaal ?? []) {
        if (m.bedrag <= 0) continue;
        regels.push(regel({ omschrijving: m.naam, aantal: rond4(m.hoeveelheid), eenheid: m.eenheid ? unitLabel(m.eenheid) : eenheid, prijsCenten: cent(m.prijsPerEenheid), soort: plant ? "planten" : "materiaal" }, opties, btwFallback));
      }
      if (ob.artikelen && ob.artikelen.bedrag > 0) {
        regels.push(regel({ omschrijving: `${lijn.naam} (artikelen)`, aantal: 1, eenheid: "post", prijsCenten: cent(ob.artikelen.bedrag), soort: "materiaal" }, opties, btwFallback));
      }
      for (const e of ob.extras ?? []) {
        if (e.bedrag <= 0) continue;
        regels.push(regel({ omschrijving: e.naam, aantal: rond4(e.aantal), eenheid: e.aantal === 1 ? "post" : eenheid, prijsCenten: cent(e.bedrag / (e.aantal || 1)), soort: "overig" }, opties, btwFallback));
      }
      if (ob.arbeid && ob.arbeid.bedrag > 0) {
        regels.push(regel({ omschrijving: "Arbeid", aantal: rond4(ob.arbeid.tijd), eenheid: ob.arbeid.eenheid, prijsCenten: cent(ob.arbeid.tarief), soort: "arbeid" }, opties, btwFallback));
      }
      if (ob.transport && ob.transport.bedrag > 0) {
        if (ob.transport.meeschalend) {
          const dagen = ob.transport.dagen;
          regels.push(regel({ omschrijving: "Transport", aantal: dagen ?? aantal, eenheid: dagen ? "dag" : eenheid, prijsCenten: cent(ob.transport.bedrag / (dagen ?? aantal)), soort: "transport" }, opties, btwFallback));
        } else {
          vasteTransport.bedrag += ob.transport.bedrag;
          vasteTransport.n += 1;
        }
      }
      if (ob.voorrijkosten && ob.voorrijkosten.bedrag > 0) {
        if (ob.voorrijkosten.meeschalend) {
          regels.push(regel({ omschrijving: "Voorrijkosten", aantal, eenheid, prijsCenten: cent(ob.voorrijkosten.bedrag / aantal), soort: "transport" }, opties, btwFallback));
        } else {
          vasteVoorrij.bedrag += ob.voorrijkosten.bedrag;
          vasteVoorrij.n += 1;
        }
      }
    } else {
      // Oude lead zonder uitsplitsing: één echte regel per onderdeel.
      let bedrag = lijn.prijs != null && lijn.prijs > 0 ? lijn.prijs : restPerRegel;
      if (!(lijn.prijs != null && lijn.prijs > 0)) {
        waarschuwingen.push(`De prijs van "${lijn.naam}" stond niet in de aanvraag. Dit is een schatting: controleer het bedrag.`);
      }
      if (bedrag <= 0) bedrag = 0;
      const details = [lijn.materiaal, lijn.extras && lijn.extras.length > 0 ? lijn.extras.join(", ") : null].filter(Boolean);
      if (bedrag > 0) {
        regels.push(
          regel(
            { omschrijving: details.length > 0 ? `${lijn.naam} (${details.join(", ")})` : lijn.naam, aantal: rond4(aantal), eenheid, prijsCenten: cent(bedrag / aantal), soort: plant ? "planten" : "overig" },
            opties,
            btwFallback
          )
        );
      }
    }
    if (regels.length > 0) secties.push({ id: nieuwId("s"), titel, productId: lijn.productId, regels });
  }

  // Voorrijkosten en transport die niet meeschalen: eigen regels, niet per sectie.
  const vast: OfferteRegel[] = [];
  const nTekst = (n: number) => (n > 1 ? ` (${n} onderdelen)` : "");
  if (vasteVoorrij.bedrag > 0) vast.push(regel({ omschrijving: `Voorrijkosten${nTekst(vasteVoorrij.n)}`, aantal: 1, eenheid: "post", prijsCenten: cent(vasteVoorrij.bedrag), soort: "transport" }, opties, btwFallback));
  if (vasteTransport.bedrag > 0) vast.push(regel({ omschrijving: `Transport${nTekst(vasteTransport.n)}`, aantal: 1, eenheid: "post", prijsCenten: cent(vasteTransport.bedrag), soort: "transport" }, opties, btwFallback));
  if (vast.length > 0) secties.push({ id: nieuwId("s"), titel: "Voorrijkosten en transport", regels: vast });

  if (snapshot.bandbreedte) waarschuwingen.push("De klant zag een prijs van–tot. In deze offerte is het midden van die bandbreedte gebruikt. Controleer de prijzen.");

  return {
    secties,
    onderwerp: onderwerpVoor(snapshot.regels.map((l: LeadSnapshotLine) => l.naam)),
    totaalRekentoolInclCenten: cent(snapshot.totaal),
    waarschuwingen,
    bandbreedte: Boolean(snapshot.bandbreedte),
  };
}
