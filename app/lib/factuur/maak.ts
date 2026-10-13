import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { rondCenten } from "@/app/lib/pricing/rond";
import { leegAdres, nieuwId, type OfferteInhoud, type OfferteRegel, type OfferteSectie } from "@/app/lib/offerte/model";
import { vandaagAmsterdam } from "@/app/lib/offerte/status";
import type { BtwGroep } from "@/app/lib/offerte/bereken";
import { factuurTotalen } from "./totalen";
import type { FactuurInhoud, FactuurMeta, FactuurSoort } from "./model";

// Pure bouwfuncties voor facturen: uit een geaccepteerde offerte (één factuur, termijnen en eindfactuur), los, met
// meerwerk, en als creditnota. Alle bedragen in centen; totalen komen altijd uit dezelfde berekening als de offerte.

const round = (x: number) => (x >= 0 ? rondCenten(x) : -rondCenten(-x));

export function plusDagen(iso: string, dagen: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
}

export type FactuurInstellingen = { betaaltermijnDagen: number; nu?: Date };

function metaBasis(soort: FactuurSoort, offerte: { nummer: string; versie: number } | null, i: FactuurInstellingen, extra: Partial<FactuurMeta> = {}): FactuurMeta {
  const vandaag = vandaagAmsterdam(i.nu);
  return {
    soort,
    nummer: null,
    factuurdatum: vandaag,
    uitvoeringVan: "",
    uitvoeringTot: "",
    vervaldatum: plusDagen(vandaag, i.betaaltermijnDagen),
    betaaltermijnDagen: i.betaaltermijnDagen,
    offerteNummer: offerte?.nummer ?? "",
    offerteVersie: offerte?.versie ?? null,
    btwModus: "normaal",
    klantBtwId: "",
    betaallink: "",
    notitie: "",
    ...extra,
  };
}

// Het gemeenschappelijke deel: klant, projectadres en huisstijl komen mee als momentopname van de offerte.
function basisUitOfferte(o: OfferteInhoud, secties: OfferteSectie[], meta: FactuurMeta, onderwerp: string): FactuurInhoud {
  return {
    nummer: "",
    versie: 1,
    datum: meta.factuurdatum,
    geldigTot: meta.vervaldatum,
    afzender: o.afzender,
    klant: o.klant,
    projectadresGelijk: o.projectadresGelijk,
    projectadres: o.projectadres,
    onderwerp,
    introductie: "",
    secties,
    voorwaarden: [],
    herroeping: { aan: false, tekst: "" },
    betaaltermijnen: [],
    planning: { startweek: "", doorlooptijd: "" },
    bijlagen: [],
    slottekst: "",
    rekenregel: 2,
    factuur: meta,
  };
}

// De regels van de geaccepteerde versie, inclusief alleen de optionele regels die de klant koos. Optionele regels
// worden gewone regels; stelposten krijgen "Te bepalen bij nacalculatie" tot er een werkelijke hoeveelheid is.
export function regelsVoorFactuur(o: Pick<OfferteInhoud, "secties">, gekozenOptioneel: readonly string[]): OfferteSectie[] {
  const gekozen = new Set(gekozenOptioneel);
  return o.secties
    .map((s) => ({
      ...s,
      regels: s.regels
        .filter((r) => r.type !== "optioneel" || gekozen.has(r.id))
        .map((r): OfferteRegel => {
          if (r.type === "stelpost") return { ...r, type: "normaal", label: "stelpost-open", toelichting: "Te bepalen bij nacalculatie" };
          if (r.type === "optioneel") return { ...r, type: "normaal" };
          return { ...r };
        }),
    }))
    .filter((s) => s.regels.length > 0);
}

export type TermijnPlanRegel = { soort: "termijn" | "eindfactuur" | "factuur"; label: string; percentage: number };

// Termijnfacturen volgens de betaaltermijnen van de offerte: alle termijnen behalve de laatste krijgen een eigen
// (aanbetalings)factuur; de laatste termijn is de eindfactuur. Bij één termijn (of geen) is het gewoon één factuur.
export function termijnPlan(betaaltermijnen: { label: string; percentage: number }[]): TermijnPlanRegel[] {
  const t = betaaltermijnen.filter((x) => x.percentage > 0);
  if (t.length <= 1) return [{ soort: "factuur", label: "Factuur", percentage: 100 }];
  return t.map((x, i) => ({ soort: i === t.length - 1 ? ("eindfactuur" as const) : ("termijn" as const), label: x.label, percentage: x.percentage }));
}

export type OfferteBron = { inhoud: OfferteInhoud; gekozenOptioneel: readonly string[]; nummer: string; versie: number };

// a. één factuur voor het totaal
export function eenFactuurUitOfferte(bron: OfferteBron, i: FactuurInstellingen, soort: "factuur" | "eindfactuur" = "factuur", eerder: EerdereFactuur[] = []): FactuurInhoud {
  const secties = regelsVoorFactuur(bron.inhoud, bron.gekozenOptioneel);
  const meta = metaBasis(soort, bron, i);
  const inhoud = basisUitOfferte(bron.inhoud, secties, meta, bron.inhoud.onderwerp);
  return eerder.length > 0 ? { ...inhoud, secties: [...inhoud.secties, aftrekSectie(eerder)] } : inhoud;
}

// b. een termijnfactuur ("Aanbetaling 30% – offerte 2026-0012"): per btw-tarief één regel met het deel van de offerte.
export function termijnFactuurUitOfferte(bron: OfferteBron, termijn: { label: string; percentage: number }, i: FactuurInstellingen): FactuurInhoud {
  const t = berekenTotalen({ secties: regelsVoorFactuur(bron.inhoud, bron.gekozenOptioneel), klant: bron.inhoud.klant, afzender: bron.inhoud.afzender, rekenregel: 2 });
  const groepen: BtwGroep[] = t.btwGroepen.filter((g) => g.grondslag !== 0);
  const regels: OfferteRegel[] = groepen.map((g) => ({
    id: nieuwId("t"),
    type: "normaal",
    omschrijving: `${termijn.label} ${termijn.percentage}% – offerte ${bron.nummer}${groepen.length > 1 ? ` (btw ${g.tarief}%)` : ""}`,
    aantal: 1,
    eenheid: "post",
    prijsCenten: round((g.grondslag * termijn.percentage) / 100),
    btw: g.tarief,
    soort: "overig",
  }));
  const vandaag = vandaagAmsterdam(i.nu);
  const meta = metaBasis("termijn", bron, i, { termijn: { label: termijn.label, percentage: termijn.percentage, offerteTotaalInclCenten: t.totaalIncl }, uitvoeringVan: vandaag });
  return basisUitOfferte(bron.inhoud, [{ id: nieuwId("s"), titel: `${termijn.label} ${termijn.percentage}%`, regels }], meta, bron.inhoud.onderwerp);
}

export type EerdereFactuur = { nummer: string; inhoud: FactuurInhoud };

// Aftrek van eerder gefactureerde bedragen op de eindfactuur: per eerdere factuur en btw-tarief één regel
// "Reeds gefactureerd: F2026-0004", zodat btw per tarief en het totaal exact kloppen.
export function aftrekSectie(eerder: EerdereFactuur[]): OfferteSectie {
  const regels: OfferteRegel[] = [];
  for (const e of eerder) {
    const t = factuurTotalen(e.inhoud);
    for (const g of t.btwGroepen.filter((x) => x.grondslag !== 0)) {
      regels.push({ id: nieuwId("a"), type: "normaal", omschrijving: `Reeds gefactureerd: ${e.nummer}`, aantal: 1, eenheid: "post", prijsCenten: -g.grondslag, btw: g.tarief, soort: "overig", label: "reeds-gefactureerd" });
    }
  }
  return { id: nieuwId("s"), titel: "Reeds gefactureerd", regels };
}

export function eindfactuurUitOfferte(bron: OfferteBron, eerder: EerdereFactuur[], i: FactuurInstellingen): FactuurInhoud {
  return eenFactuurUitOfferte(bron, i, "eindfactuur", eerder);
}

// Een losse factuur zonder offerte (kleine klussen): klant en onderwerp invullen en regels toevoegen.
export function losseFactuur(
  basis: { afzender: OfferteInhoud["afzender"]; klant?: Partial<OfferteInhoud["klant"]>; onderwerp?: string; secties?: OfferteSectie[] },
  i: FactuurInstellingen
): FactuurInhoud {
  const meta = metaBasis("factuur", null, i);
  const o = {
    afzender: basis.afzender,
    klant: { type: "particulier" as const, naam: "", bedrijfsnaam: "", adres: leegAdres(), email: "", telefoon: "", ...basis.klant },
    projectadresGelijk: true,
    projectadres: leegAdres(),
  } as OfferteInhoud;
  const secties = basis.secties ?? [{ id: nieuwId("s"), titel: "Werk", regels: [{ id: nieuwId(), type: "normaal", omschrijving: "", aantal: 1, eenheid: "post", prijsCenten: 0, btw: 21, soort: "overig" }] }];
  return basisUitOfferte(o, secties, meta, basis.onderwerp ?? "");
}

// Meerwerk: regels met het label "Meerwerk" en een notitie ("Akkoord klant op 14-10").
export function voegMeerwerkToe(inhoud: FactuurInhoud, r: { omschrijving: string; aantal: number; eenheid: string; prijsCenten: number; btw: number; soort?: OfferteRegel["soort"]; notitie?: string }): FactuurInhoud {
  const regel: OfferteRegel = { id: nieuwId(), type: "normaal", omschrijving: r.omschrijving, aantal: r.aantal, eenheid: r.eenheid, prijsCenten: r.prijsCenten, btw: r.btw, soort: r.soort ?? "overig", label: "meerwerk", ...(r.notitie ? { toelichting: r.notitie } : {}) };
  const bestaand = inhoud.secties.find((s) => s.titel === "Meerwerk");
  const secties = bestaand ? inhoud.secties.map((s) => (s === bestaand ? { ...s, regels: [...s.regels, regel] } : s)) : [...inhoud.secties, { id: nieuwId("s"), titel: "Meerwerk", regels: [regel] }];
  return { ...inhoud, secties };
}

// Creditnota: geheel of voor geselecteerde regels. Negatieve bedragen (de prijs wordt negatief, het aantal blijft staan),
// met verwijzing naar de oorspronkelijke factuur.
export function creditnotaUitFactuur(orig: { nummer: string; inhoud: FactuurInhoud }, i: FactuurInstellingen, regelIds?: readonly string[]): FactuurInhoud {
  const kies = regelIds ? new Set(regelIds) : null;
  const secties = orig.inhoud.secties
    .map((s) => ({ ...s, id: nieuwId("s"), regels: s.regels.filter((r) => r.type !== "tekst" && (!kies || kies.has(r.id))).map((r) => ({ ...r, id: nieuwId(), prijsCenten: -r.prijsCenten, label: undefined })) }))
    .filter((s) => s.regels.length > 0);
  const f = orig.inhoud.factuur;
  const meta = metaBasis("creditnota", f.offerteNummer ? { nummer: f.offerteNummer, versie: f.offerteVersie ?? 1 } : null, i, {
    btwModus: f.btwModus,
    klantBtwId: f.klantBtwId,
    uitvoeringVan: f.uitvoeringVan,
    uitvoeringTot: f.uitvoeringTot,
    creditVoor: { nummer: orig.nummer, datum: f.factuurdatum },
    betaaltermijnDagen: 0,
  });
  meta.vervaldatum = meta.factuurdatum;
  return { ...orig.inhoud, nummer: "", datum: meta.factuurdatum, geldigTot: meta.vervaldatum, onderwerp: `Creditnota bij factuur ${orig.nummer}`, secties, factuur: meta };
}


// Na elke wijziging in de editor: een stelpost waarvan de hoeveelheid of de prijs is aangepast, is niet langer "te bepalen";
// en de vervaldatum volgt de betaaltermijn zolang de hovenier die niet zelf aanpast.
export function normaliseerFactuur(oud: FactuurInhoud, nieuw: FactuurInhoud): FactuurInhoud {
  const oudeRegels = new Map(oud.secties.flatMap((s) => s.regels).map((r) => [r.id, r]));
  const secties = nieuw.secties.map((s) => ({
    ...s,
    regels: s.regels.map((r) => {
      const was = oudeRegels.get(r.id);
      if (r.label === "stelpost-open" && was && (was.aantal !== r.aantal || was.prijsCenten !== r.prijsCenten)) {
        return { ...r, label: undefined, toelichting: "Werkelijke hoeveelheid (nacalculatie)" };
      }
      return r;
    }),
  }));
  return { ...nieuw, secties, datum: nieuw.factuur.factuurdatum, geldigTot: nieuw.factuur.vervaldatum, herroeping: { aan: false, tekst: "" } };
}
