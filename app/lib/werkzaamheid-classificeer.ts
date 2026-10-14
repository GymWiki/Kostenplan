import type { Expression, OnderdeelConfig } from "@/app/lib/calculator-engine";
import { evalueerOnderdeel } from "@/app/lib/calculator-engine";
import type { EngineTarieven } from "@/app/lib/werkzaamheid-engine";
import { MATERIAAL_VELD_ID, werkzaamheidNaarOnderdeel } from "@/app/lib/werkzaamheid-engine";
import type { ExtraRij, MateriaalRij, Methode, WerkzaamheidDraft } from "@/app/lib/werkzaamheid";
import { formatGetalInvoer } from "@/app/lib/getal";

// Beoordeelt of een bestaand engine-onderdeel in het standaardmodel van een
// werkzaamheid past. Werkwijze: haal een kandidaat-werkzaamheid uit het
// onderdeel, bouw er via werkzaamheidNaarOnderdeel() weer een onderdeel van
// en reken beide door voor een raster van voorbeeldinvoer. Is het verschil
// overal 0 dan past het ("STANDAARD"); anders is het "AANGEPAST" en laat
// `verschillen` zien wat er bij omzetten verandert (prijsvoorbeeld vóór
// bevestigen). Kan er geen kandidaat uit gehaald worden, dan blijft het
// "AANGEPAST" zonder omzetoptie.

export type MateriaalBron = { id: string; naam: string; prijs: number };

export type Verschil = { beschrijving: string; oud: number; nieuw: number };

export type Classificatie =
  | { soort: "STANDAARD"; draft: WerkzaamheidDraft }
  | { soort: "AANGEPAST"; samenvatting: string[]; kanOmzetten: false }
  | { soort: "AANGEPAST"; samenvatting: string[]; kanOmzetten: true; draft: WerkzaamheidDraft; verschillen: Verschil[] };

const HOEVEELHEDEN = [5, 20, 50];

function getal(e: Expression | undefined): number | null {
  return e && e.kind === "GETAL" ? e.waarde : null;
}

function variabele(e: Expression | undefined): string | null {
  return e && e.kind === "VARIABELE" ? e.naam : null;
}

export function samenvattingVanOnderdeel(o: OnderdeelConfig): string[] {
  const regels: string[] = [];
  const vragen = o.velden.filter((v) => v.soort !== "PRODUCT_KEUZE").length;
  regels.push(`${vragen} ${vragen === 1 ? "vraag" : "vragen"} aan de klant`);
  const actief = o.regels.filter((r) => r.actief);
  regels.push(`${actief.length} ${actief.length === 1 ? "berekening" : "berekeningen"}: ${actief.map((r) => r.label).join(", ") || "geen"}`);
  return regels;
}

function haalKandidaat(o: OnderdeelConfig, materialen: MateriaalBron[]): WerkzaamheidDraft | null {
  const hoeveelheidVeld = o.velden.find((v) => ["NUMMER", "OPPERVLAKTE", "AANTAL", "AFMETINGEN"].includes(v.soort));
  const keuze = o.velden.find((v) => v.soort === "PRODUCT_KEUZE");
  if (!hoeveelheidVeld || !keuze || materialen.length === 0) return null;

  let methode: Methode;
  switch (hoeveelheidVeld.soort) {
    case "AFMETINGEN":
      methode = "LENGTE_BREEDTE";
      break;
    case "OPPERVLAKTE":
      methode = "M2";
      break;
    case "AANTAL":
      methode = "STUK";
      break;
    default:
      methode = "METER";
  }

  // Werktempo: een constante, of een keten per materiaal.
  const tempoVar = o.afgeleideVariabelen.find((v) => v.id === "tempo") ?? o.afgeleideVariabelen[0];
  let standaard = "";
  const perMateriaal: Record<string, string> = {};
  let expr: Expression | undefined = tempoVar?.expression;
  while (expr) {
    if (expr.kind === "GETAL") {
      standaard = String(expr.waarde);
      break;
    }
    if (expr.kind === "ALS_DAN" && expr.voorwaarde.kind === "GELIJK_AAN" && expr.voorwaarde.rechts.kind === "TEKST") {
      const g = getal(expr.dan);
      if (g === null) return null;
      perMateriaal[expr.voorwaarde.rechts.waarde] = String(g);
      expr = expr.anders;
      continue;
    }
    return null;
  }

  const extras: ExtraRij[] = [];
  const vraagVelden = new Map(o.velden.map((v) => [v.id, v]));
  for (const r of o.regels) {
    if (!r.actief || r.categorie !== "TOESLAG") continue;
    if (r.type === "TOESLAG") {
      const g = getal(r.bedrag);
      if (g !== null && !r.voorwaarde) extras.push({ sleutel: r.id, naam: r.label, prijs: String(g), type: "PER_STUK", altijd: true });
    } else if (r.type === "PER_EENHEID") {
      const prijs = getal(r.prijsPerEenheid);
      if (prijs === null) continue;
      const veldNaam = variabele(r.hoeveelheid);
      const veld = veldNaam ? vraagVelden.get(veldNaam) : undefined;
      if (veld?.soort === "AANTAL") extras.push({ sleutel: veld.id, naam: r.label, prijs: formatGetalInvoer(prijs), type: "PER_STUK", altijd: false });
      else if (!r.voorwaarde) extras.push({ sleutel: r.id, naam: r.label, prijs: formatGetalInvoer(prijs), type: "PER_EENHEID", altijd: true });
      else {
        const v = variabele(r.voorwaarde);
        if (v && vraagVelden.get(v)?.soort === "JA_NEE") extras.push({ sleutel: v, naam: r.label, prijs: formatGetalInvoer(prijs), type: "PER_EENHEID", altijd: false });
      }
    }
  }

  const rijen: MateriaalRij[] = materialen.map((m) => ({
    sleutel: m.id,
    id: m.id,
    naam: m.naam,
    prijs: formatGetalInvoer(m.prijs),
    prijsMin: "",
    prijsMax: "",
    productiviteitOverride: perMateriaal[m.id] ?? "",
    isVoorbeeld: false,
  }));
  return {
    naam: o.naam,
    methode,
    productiviteit: standaard,
    transportPerDag: false,
    bandbreedte: false,
    werktempoPerMateriaal: Object.keys(perMateriaal).length > 0,
    materialen: rijen,
    extras,
  };
}

function waardenVoor(o: OnderdeelConfig, hoeveelheid: number, materiaalId: string, extraAan: boolean): Record<string, unknown> {
  const w: Record<string, unknown> = { [MATERIAAL_VELD_ID]: materiaalId };
  for (const v of o.velden) {
    if (v.id === MATERIAAL_VELD_ID || v.soort === "PRODUCT_KEUZE") w[v.id] = materiaalId;
    else if (v.soort === "AFMETINGEN") w[v.id] = { lengte: String(hoeveelheid), breedte: "1" };
    else if (v.soort === "JA_NEE") w[v.id] = extraAan;
    else if (v.soort === "AANTAL") w[v.id] = extraAan ? "2" : "0";
    else w[v.id] = String(hoeveelheid);
  }
  return w;
}

export function classificeerOnderdeel(
  onderdeel: OnderdeelConfig,
  materialen: MateriaalBron[],
  tarieven: EngineTarieven
): Classificatie {
  const samenvatting = samenvattingVanOnderdeel(onderdeel);
  const draft = haalKandidaat(onderdeel, materialen);
  if (!draft) return { soort: "AANGEPAST", samenvatting, kanOmzetten: false };

  const keuzeVeld = onderdeel.velden.find((v) => v.soort === "PRODUCT_KEUZE");
  const materialCategoryId = keuzeVeld && keuzeVeld.soort === "PRODUCT_KEUZE" ? keuzeVeld.materialCategoryId : "";
  const nieuw = werkzaamheidNaarOnderdeel({ id: onderdeel.id, draft, materialCategoryId, order: onderdeel.order }, tarieven).onderdeel;
  const prijsMap = Object.fromEntries(materialen.map((m) => [m.id, m.prijs]));

  const verschillen: Verschil[] = [];
  let gelijk = true;
  for (const m of materialen) {
    for (const hoeveelheid of HOEVEELHEDEN) {
      for (const extraAan of [false, true]) {
        const oud = evalueerOnderdeel(onderdeel, waardenVoor(onderdeel, hoeveelheid, m.id, extraAan), prijsMap).subtotaal;
        const nw = evalueerOnderdeel(nieuw, waardenVoor(nieuw, hoeveelheid, m.id, extraAan), prijsMap).subtotaal;
        if (Math.abs(oud - nw) > 0.005) {
          gelijk = false;
          verschillen.push({ beschrijving: `${hoeveelheid} ${m.naam}${extraAan ? " met extra's" : ""}`, oud, nieuw: nw });
        }
      }
    }
  }
  if (gelijk) return { soort: "STANDAARD", draft };
  return { soort: "AANGEPAST", samenvatting, kanOmzetten: true, draft, verschillen: verschillen.slice(0, 6) };
}
