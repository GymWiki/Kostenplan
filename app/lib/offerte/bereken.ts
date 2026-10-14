import { rondCenten } from "@/app/lib/pricing/rond";
import type { OfferteInhoud, OfferteRegel } from "./model";

// Berekening van een offerte, puur en in centen. Wordt server-side gebruikt
// voor het opslaan, versturen en akkoord geven; de browser gebruikt dezelfde
// functie voor de weergave.
//
// Afronding: per regel op hele centen (kortingsbedrag en regelbedrag apart).
// Particulier: de klant ziet prijzen incl. btw; de btw-groepen worden dan uit
// de som van de regelbedragen incl. btw teruggerekend, zodat wat op het document
// staat altijd optelt. Zakelijk: btw per tarief over de som excl. btw.

// Dezelfde afrondingsregel als de rekenkern (half omhoog op hele centen; negatieve bedragen spiegelen).
const round = (x: number) => (x >= 0 ? rondCenten(x) : -rondCenten(-x));

export function regelBedragExcl(r: Pick<OfferteRegel, "aantal" | "prijsCenten" | "kortingPct" | "type">): number {
  if (r.type === "tekst") return 0;
  const bruto = round(r.aantal * r.prijsCenten);
  const korting = r.kortingPct ? round((bruto * r.kortingPct) / 100) : 0;
  return bruto - korting;
}

export type RegelUitkomst = {
  id: string;
  excl: number; // netto na korting, excl. btw
  korting: number; // kortingsbedrag excl. btw (positief)
  btw: number; // btw-percentage dat is toegepast (0 bij KOR)
  incl: number; // incl. btw
  meetel: boolean; // telt mee in de totalen
};

export type BtwGroep = { tarief: number; grondslag: number; btw: number };

export type Totalen = {
  regels: Record<string, RegelUitkomst>;
  secties: { id: string; excl: number; incl: number }[];
  btwGroepen: BtwGroep[];
  totaalExcl: number;
  totaalBtw: number;
  totaalIncl: number;
  // Totaal van optionele regels die de klant (nog) niet koos.
  optioneelNietGekozenIncl: number;
  toonIncl: boolean;
  kor: boolean;
  // Btw verlegd (alleen facturen aan zakelijke klanten): geen btw berekend, wel vermeld.
  verlegd: boolean;
};

export function berekenTotalen(
  inhoud: Pick<OfferteInhoud, "secties" | "klant" | "afzender"> & { rekenregel?: OfferteInhoud["rekenregel"]; factuur?: { btwModus?: "normaal" | "verlegd" } },
  gekozenOptioneel: ReadonlySet<string> | readonly string[] = []
): Totalen {
  const gekozen = gekozenOptioneel instanceof Set ? gekozenOptioneel : new Set(gekozenOptioneel);
  const verlegd = inhoud.factuur?.btwModus === "verlegd";
  // Zonder btw rekenen: kleineondernemersregeling of btw verlegd.
  const kor = inhoud.afzender.korActief;
  const geenBtw = kor || verlegd;
  const toonIncl = inhoud.klant.type === "particulier" && !geenBtw;

  const regels: Record<string, RegelUitkomst> = {};
  const secties: Totalen["secties"] = [];
  const groepIncl = new Map<number, number>();
  const groepExcl = new Map<number, number>();
  let optioneelNietGekozenIncl = 0;

  for (const sectie of inhoud.secties) {
    let sExcl = 0;
    let sIncl = 0;
    for (const r of sectie.regels) {
      const tarief = geenBtw ? 0 : r.btw;
      let excl = regelBedragExcl(r);
      let korting = r.type === "tekst" ? 0 : round((r.aantal * r.prijsCenten) - 0) - excl;
      let incl = excl + round((excl * tarief) / 100);
      if (inhoud.rekenregel === 3 && toonIncl && r.type !== "tekst") {
        // Particulier: de klant ziet de prijs per eenheid incl. btw (op hele centen). Het regeltotaal is aantal × díe prijs,
        // zodat er op het document altijd klopt wat er staat. De btw volgt daaruit (terugrekenen per tarief).
        const bruto = round(r.aantal * prijsPerEenheidWeergave(r, true, false));
        const kortingIncl = r.kortingPct ? round((bruto * r.kortingPct) / 100) : 0;
        incl = bruto - kortingIncl;
        excl = tarief === 0 ? incl : round((incl * 100) / (100 + tarief));
        korting = tarief === 0 ? kortingIncl : round((bruto * 100) / (100 + tarief)) - excl;
      }
      const meetel = r.type !== "tekst" && (r.type !== "optioneel" || gekozen.has(r.id));
      regels[r.id] = { id: r.id, excl, korting, btw: tarief, incl, meetel };
      if (r.type === "optioneel" && !gekozen.has(r.id)) optioneelNietGekozenIncl += incl;
      if (!meetel) continue;
      sExcl += excl;
      sIncl += incl;
      groepExcl.set(tarief, (groepExcl.get(tarief) ?? 0) + excl);
      groepIncl.set(tarief, (groepIncl.get(tarief) ?? 0) + incl);
    }
    secties.push({ id: sectie.id, excl: sExcl, incl: sIncl });
  }

  // Rekenregel 2 (nieuwe offertes, gelijk aan de rekenkern in app/lib/pricing): de btw is de som van de btw
  // per regel, zodat de getoonde regels altijd optellen tot het totaal. Offertes zonder `rekenregel` rekenen
  // zoals ze verstuurd zijn: de btw per tarief over de som van de regels.
  const perRegel = inhoud.rekenregel === 2 || inhoud.rekenregel === 3;
  const btwGroepen: BtwGroep[] = [...groepExcl.keys()]
    .sort((a, b) => b - a)
    .map((tarief) => {
      if (perRegel) {
        const excl = groepExcl.get(tarief) ?? 0;
        return { tarief, grondslag: excl, btw: (groepIncl.get(tarief) ?? 0) - excl };
      }
      if (toonIncl) {
        const incl = groepIncl.get(tarief) ?? 0;
        const btw = tarief === 0 ? 0 : round((incl * tarief) / (100 + tarief));
        return { tarief, grondslag: incl - btw, btw };
      }
      const excl = groepExcl.get(tarief) ?? 0;
      return { tarief, grondslag: excl, btw: round((excl * tarief) / 100) };
    });

  const totaalExcl = btwGroepen.reduce((s, g) => s + g.grondslag, 0);
  const totaalBtw = btwGroepen.reduce((s, g) => s + g.btw, 0);
  return { regels, secties, btwGroepen, totaalExcl, totaalBtw, totaalIncl: totaalExcl + totaalBtw, optioneelNietGekozenIncl, toonIncl, kor, verlegd };
}

// Prijs per eenheid zoals de klant hem ziet (incl. btw voor particulieren).
export function prijsPerEenheidWeergave(r: OfferteRegel, toonIncl: boolean, kor: boolean): number {
  if (!toonIncl || kor) return r.prijsCenten;
  return round((r.prijsCenten * (100 + r.btw)) / 100);
}
