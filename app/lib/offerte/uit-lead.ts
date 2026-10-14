import type { LeadSnapshot, LeadSnapshotLine } from "@/app/lib/leads";
import { formatAantal, formatEenheid, formatHoeveelheid } from "@/app/lib/pricing/format";
import type { PrijsRegel, PricingResult } from "@/app/lib/pricing/engine";
import { isPlantenNaam, type RegelSoort } from "./btw-config";
import { nieuwId, type OfferteRegel, type OfferteSectie } from "./model";

// Zet een lead (bevroren berekening uit de rekentool) om in secties en losse offerteregels met de
// échte prijzen: per materiaalcategorie, arbeid, extra's, transport en voorrijkosten. Nooit een regel op
// €0 en nooit een samengevoegde restpost. Bedragen in centen.
//
// Drie bronnen, de beste die beschikbaar is:
//  1. snapshot.rekenkern: de volledige opbouw uit de rekenkern. Elke offerteregel krijgt exact het bedrag
//     van de rekenkernregel, dus het offertetotaal is gelijk aan het totaal dat de klant zag.
//  2. snapshot.regels[].opbouw: oudere snapshots met een uitsplitsing per onderdeel (in euro's).
//  3. alleen totalen of een bedrag per onderdeel: losse regels uit de totalen, of één regel per onderdeel.

export type BouwOpties = {
  // Een eigen btw-tarief per regelsoort uit het Profiel. Zonder instelling volgt elke regel het btw-tarief van de
  // rekentool, zodat het offertetotaal gelijk blijft aan wat de klant zag.
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
  // Het minimumbedrag (incl. btw) waarop de rekentool heeft aangevuld; 0 als er niet is aangevuld. Zie minimum.ts.
  minimumInclCenten?: number;
};

export const MINIMUM_OMSCHRIJVING = "Aanvulling tot minimumtarief";

const cent = (euro: number) => Math.round(euro * 100 + 1e-9);
const rondCent = (x: number) => Math.round(Math.round(x * 1e6) / 1e6);

function regel(r: Partial<OfferteRegel> & Pick<OfferteRegel, "omschrijving" | "aantal" | "eenheid" | "prijsCenten" | "soort">, opties: BouwOpties, btwFallback: number): OfferteRegel {
  const eigen = opties.btwStandaard?.[r.soort];
  const btw = typeof eigen === "number" ? eigen : btwFallback;
  return { id: nieuwId(), type: "normaal", btw, ...r };
}

// Een regel die precies het gegeven bedrag oplevert (aantal × prijs, op hele centen). Kan dat niet met een
// prijs in hele centen per eenheid (een prijs met een deel van een cent), dan wordt het één post.
function exact(basis: { omschrijving: string; eenheid: string }, aantal: number, bedragCenten: number, prijsPerEenheidCenten: number): { omschrijving: string; aantal: number; eenheid: string; prijsCenten: number } {
  if (aantal > 0) {
    const kandidaten = [Math.round(prijsPerEenheidCenten), Math.round(bedragCenten / aantal), Math.floor(bedragCenten / aantal), Math.ceil(bedragCenten / aantal)];
    for (const prijs of kandidaten) {
      if (prijs > 0 && rondCent(aantal * prijs) === bedragCenten) return { omschrijving: basis.omschrijving, aantal, eenheid: basis.eenheid, prijsCenten: prijs };
    }
  }
  return { omschrijving: `${basis.omschrijving} (${formatAantal(aantal)} ${basis.eenheid})`, aantal: 1, eenheid: "post", prijsCenten: bedragCenten };
}

function onderwerpVoor(namen: string[]): string {
  const uniek = [...new Set(namen.filter(Boolean))];
  if (uniek.length === 0) return "Offerte";
  if (uniek.length === 1) return uniek[0];
  if (uniek.length === 2) return `${uniek[0]} en ${uniek[1].charAt(0).toLowerCase()}${uniek[1].slice(1)}`;
  return `${uniek.slice(0, -1).join(", ")} en ${uniek[uniek.length - 1].charAt(0).toLowerCase()}${uniek[uniek.length - 1].slice(1)}`;
}

const soortVoor = (r: PrijsRegel, plant: boolean): RegelSoort => (r.soort === "arbeid" ? "arbeid" : r.soort === "transport" || r.soort === "voorrijkosten" ? "transport" : r.soort === "extra" ? "overig" : plant ? "planten" : "materiaal");

function bouwUitRekenkern(snapshot: LeadSnapshot, rk: PricingResult, opties: BouwOpties): OfferteBouwResultaat {
  const waarschuwingen: string[] = [];
  const btwFallback = snapshot.btwPercentage ?? rk.btwPercentage;
  const secties: OfferteSectie[] = [];
  const vasteTransport = { bedrag: 0, n: 0 };
  const vasteVoorrij = { bedrag: 0, n: 0 };
  let heeftPlanten = false;

  for (const o of rk.onderdelen) {
    const plant = isPlantenNaam(o.naam);
    const regels: OfferteRegel[] = [];
    for (const r of o.regels) {
      if (r.bedragExclCenten <= 0) continue;
      const eenheid = r.soort === "arbeid" || r.eenheid === "dag" || r.eenheid === "post" ? r.eenheid : formatEenheid(r.eenheid);
      // Vaste transport- en voorrijkosten per onderdeel worden één regel in de offerte, zoals de klant ze als totaal zag.
      if (r.eenheid === "post" && r.soort === "transport") {
        vasteTransport.bedrag += r.bedragExclCenten;
        vasteTransport.n += 1;
        continue;
      }
      if (r.eenheid === "post" && r.soort === "voorrijkosten") {
        vasteVoorrij.bedrag += r.bedragExclCenten;
        vasteVoorrij.n += 1;
        continue;
      }
      const soort = soortVoor(r, plant);
      if (soort === "planten") heeftPlanten = true;
      const e = exact({ omschrijving: r.omschrijving, eenheid }, r.aantal, r.bedragExclCenten, r.prijsPerEenheidCenten);
      regels.push(regel({ ...e, soort }, opties, btwFallback));
    }
    const titel = o.hoeveelheid > 0 ? `${o.naam} – ${formatHoeveelheid(o.hoeveelheid, o.eenheid)}` : o.naam;
    if (regels.length > 0) secties.push({ id: nieuwId("s"), titel, productId: o.id, regels });
  }

  // Vaste kosten die één keer per aanvraag gelden, of de samengevoegde vaste kosten van de onderdelen.
  const vast: OfferteRegel[] = [];
  const nTekst = (n: number) => (n > 1 ? ` (${n} onderdelen)` : "");
  const eigenRegels: OfferteRegel[] = [];
  for (const p of rk.projectRegels) {
    if (p.bedragExclCenten <= 0) continue;
    // Afstandstoeslag en minimumaanvulling zijn eigen regels met hun eigen naam; ze horen niet bij "Transport".
    if (p.soort === "afstand") {
      const e = exact({ omschrijving: p.omschrijving, eenheid: p.eenheid }, p.aantal, p.bedragExclCenten, p.prijsPerEenheidCenten);
      eigenRegels.push(regel({ ...e, soort: "transport" }, opties, btwFallback));
    } else if (p.soort === "minimum") {
      eigenRegels.push(regel({ omschrijving: MINIMUM_OMSCHRIJVING, aantal: 1, eenheid: "post", prijsCenten: p.bedragExclCenten, soort: "overig" }, opties, btwFallback));
    } else {
      const bestaand = p.soort === "voorrijkosten" ? vasteVoorrij : vasteTransport;
      bestaand.bedrag += p.bedragExclCenten;
    }
  }
  if (vasteVoorrij.bedrag > 0) vast.push(regel({ omschrijving: `Voorrijkosten${nTekst(vasteVoorrij.n)}`, aantal: 1, eenheid: "post", prijsCenten: vasteVoorrij.bedrag, soort: "transport" }, opties, btwFallback));
  if (vasteTransport.bedrag > 0) vast.push(regel({ omschrijving: `Transport${nTekst(vasteTransport.n)}`, aantal: 1, eenheid: "post", prijsCenten: vasteTransport.bedrag, soort: "transport" }, opties, btwFallback));
  const afstand = eigenRegels.filter((r) => r.omschrijving !== MINIMUM_OMSCHRIJVING);
  const minimum = eigenRegels.filter((r) => r.omschrijving === MINIMUM_OMSCHRIJVING);
  vast.push(...afstand);
  if (vast.length > 0) secties.push({ id: nieuwId("s"), titel: "Voorrijkosten en transport", regels: vast });
  if (minimum.length > 0) secties.push({ id: nieuwId("s"), titel: "Minimumtarief", regels: minimum });

  if (rk.bandbreedte) waarschuwingen.push("De klant zag een prijs van–tot. In deze offerte is het midden van die bandbreedte gebruikt. Controleer de prijzen.");
  if (heeftPlanten && btwFallback !== 9 && opties.btwStandaard?.planten == null) {
    waarschuwingen.push(`Levering van planten valt vaak onder het verlaagde btw-tarief van 9%. In deze offerte staat ${btwFallback}%, zoals in de rekentool. Pas het tarief per regel aan als dat niet klopt.`);
  }
  for (const w of rk.waarschuwingen) waarschuwingen.push(w.bericht);

  return {
    secties,
    onderwerp: onderwerpVoor(rk.onderdelen.map((o) => o.naam)),
    totaalRekentoolInclCenten: rk.bandbreedte ? rk.bandbreedte.max.totaalInclCenten : rk.totaalInclCenten,
    waarschuwingen,
    bandbreedte: Boolean(rk.bandbreedte),
    minimumInclCenten: minimum.length > 0 ? rk.minimum.minimumInclCenten : 0,
  };
}

const aantalTekst = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ","));

// Oudere snapshots (zonder rekenkern): uitsplitsing per onderdeel, of alleen totalen.
function bouwUitOudeSnapshot(snapshot: LeadSnapshot, opties: BouwOpties): OfferteBouwResultaat {
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

  // Geen uitsplitsing per onderdeel, maar wel kloppende totalen per kostensoort: losse regels uit die totalen.
  const heeftOpbouw = snapshot.regels.some((l) => l.opbouw && (l.opbouw.materiaal?.length || l.opbouw.arbeid || l.opbouw.artikelen || l.opbouw.extras?.length || l.opbouw.transport || l.opbouw.voorrijkosten));
  const somTotalen = snapshot.materiaalkosten + snapshot.arbeidskosten + snapshot.transportkosten + snapshot.voorrijkosten;
  if (!heeftOpbouw && metPrijs.length === 0 && snapshot.subtotaal > 0 && Math.abs(somTotalen - snapshot.subtotaal) < 0.02) {
    const regels: OfferteRegel[] = [];
    const posten: [string, number, RegelSoort][] = [["Materiaal", snapshot.materiaalkosten, "materiaal"], ["Arbeid", snapshot.arbeidskosten, "arbeid"], ["Transport", snapshot.transportkosten, "transport"], ["Voorrijkosten", snapshot.voorrijkosten, "transport"]];
    for (const [omschrijving, bedrag, soort] of posten) {
      if (bedrag > 0) regels.push(regel({ omschrijving, aantal: 1, eenheid: "post", prijsCenten: cent(bedrag), soort }, opties, btwFallback));
    }
    if (regels.length > 0) secties.push({ id: nieuwId("s"), titel: onderwerpVoor(snapshot.regels.map((l) => l.naam)), regels });
    waarschuwingen.push("Deze aanvraag bevat geen uitsplitsing per onderdeel. De regels komen uit de totalen per kostensoort. Controleer de prijzen.");
    if (snapshot.bandbreedte) waarschuwingen.push("De klant zag een prijs van–tot. In deze offerte is het midden van die bandbreedte gebruikt. Controleer de prijzen.");
    return { secties, onderwerp: onderwerpVoor(snapshot.regels.map((l: LeadSnapshotLine) => l.naam)), totaalRekentoolInclCenten: cent(snapshot.totaal), waarschuwingen, bandbreedte: Boolean(snapshot.bandbreedte) };
  }

  for (const lijn of snapshot.regels) {
    const aantal = lijn.aantal != null && lijn.aantal > 0 ? lijn.aantal : 1;
    const eenheid = lijn.eenheid ? formatEenheid(lijn.eenheid) : "stuk";
    const titel = lijn.aantal != null && lijn.aantal > 0 && lijn.eenheid ? `${lijn.naam} – ${aantalTekst(lijn.aantal)} ${eenheid}` : lijn.naam;
    const plant = isPlantenNaam(lijn.naam);
    const ob = lijn.opbouw;
    const regels: OfferteRegel[] = [];

    if (ob && (ob.materiaal?.length || ob.arbeid || ob.artikelen || ob.extras?.length || ob.transport || ob.voorrijkosten)) {
      for (const m of ob.materiaal ?? []) {
        if (m.bedrag <= 0) continue;
        regels.push(regel({ ...exact({ omschrijving: m.naam, eenheid: m.eenheid ? formatEenheid(m.eenheid) : eenheid }, m.hoeveelheid, cent(m.bedrag), cent(m.prijsPerEenheid)), soort: plant ? "planten" : "materiaal" }, opties, btwFallback));
      }
      if (ob.artikelen && ob.artikelen.bedrag > 0) {
        regels.push(regel({ omschrijving: `${lijn.naam} (artikelen)`, aantal: 1, eenheid: "post", prijsCenten: cent(ob.artikelen.bedrag), soort: "materiaal" }, opties, btwFallback));
      }
      for (const e of ob.extras ?? []) {
        if (e.bedrag <= 0) continue;
        regels.push(regel({ ...exact({ omschrijving: e.naam, eenheid: e.aantal === 1 ? "post" : eenheid }, e.aantal || 1, cent(e.bedrag), cent(e.bedrag / (e.aantal || 1))), soort: "overig" }, opties, btwFallback));
      }
      if (ob.arbeid && ob.arbeid.bedrag > 0) {
        regels.push(regel({ ...exact({ omschrijving: "Arbeid", eenheid: ob.arbeid.eenheid }, ob.arbeid.tijd, cent(ob.arbeid.bedrag), cent(ob.arbeid.tarief)), soort: "arbeid" }, opties, btwFallback));
      }
      if (ob.transport && ob.transport.bedrag > 0) {
        if (ob.transport.meeschalend) {
          const dagen = ob.transport.dagen;
          regels.push(regel({ ...exact({ omschrijving: "Transport", eenheid: dagen ? "dag" : eenheid }, dagen ?? aantal, cent(ob.transport.bedrag), cent(ob.transport.bedrag / (dagen ?? aantal))), soort: "transport" }, opties, btwFallback));
        } else {
          vasteTransport.bedrag += ob.transport.bedrag;
          vasteTransport.n += 1;
        }
      }
      if (ob.voorrijkosten && ob.voorrijkosten.bedrag > 0) {
        if (ob.voorrijkosten.meeschalend) {
          regels.push(regel({ ...exact({ omschrijving: "Voorrijkosten", eenheid }, aantal, cent(ob.voorrijkosten.bedrag), cent(ob.voorrijkosten.bedrag / aantal)), soort: "transport" }, opties, btwFallback));
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
            { ...exact({ omschrijving: details.length > 0 ? `${lijn.naam} (${details.join(", ")})` : lijn.naam, eenheid }, aantal, cent(bedrag), cent(bedrag / aantal)), soort: plant ? "planten" : "overig" },
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

export function bouwOfferteUitLead(snapshot: LeadSnapshot, opties: BouwOpties = {}): OfferteBouwResultaat {
  const rk = snapshot.rekenkern?.resultaat;
  if (rk && Array.isArray(rk.onderdelen) && rk.onderdelen.length > 0) return bouwUitRekenkern(snapshot, rk, opties);
  return bouwUitOudeSnapshot(snapshot, opties);
}
