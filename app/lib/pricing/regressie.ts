import { calculateBreakdownRange as oudBerekenRange, type BreakdownRange as OudRange } from "./legacy/calculate-oud";
import { bouwResultaat as oudResultaat } from "./legacy/result-oud";
import { bouwResultaat as nieuwResultaat } from "@/app/lib/calculator-engine/result";
import { alleVeldenVanConfig } from "@/app/lib/calculator-engine/modulair";
import { berekenModulair } from "@/app/lib/calculator-engine/rekenen";
import { parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine/config";
import type { AnyCalculatorConfigData } from "@/app/lib/calculator-engine/modulair-types";
import { berekenHoeveelheidVoorSjabloon, coerceVeldWaarden, hoeveelheidUitResultaat, klantVeldenVoorSjabloon } from "@/app/lib/sjablonen";
import { resolveCostSettings } from "@/app/lib/tools";
import { configVanProducten, invoerVanKlant, type BronMateriaal, type BronProduct } from "./adapters";
import { berekenPrijs } from "./engine";

// Regressierapport: voor elke bestaande rekentool met een vaste set voorbeeldinvoer het totaal van de oude
// berekening (bevroren kopie in ./legacy) en van de rekenkern. Puur en zonder database; het script
// scripts/prijzen-regressie.ts leest de rekentools (alleen lezen) en roept dit aan.

export type RegressieProduct = Omit<BronProduct, "naam" | "eenheid" | "materiaalCategorieen" | "extraOpties"> & {
  naam: string;
  eenheid: string;
  actief?: boolean;
  materiaalCategorieen: { id: string; naam: string; verplicht?: boolean; materialen: (BronMateriaal & { actief?: boolean })[] }[];
  extraOpties: { id: string; naam: string; prijs: number; altijd?: boolean; type: "PER_EENHEID" | "PER_STUK"; actief?: boolean }[];
};

export type RegressieTool = {
  id: string;
  naam: string;
  bedrijf: string;
  company: { standaardArbeidTariefUur: number; standaardVoorrijTarief: number; standaardBtwPercentage: number };
  costSettings: {
    arbeidEnabled: boolean;
    arbeidStapEenheid: "UUR" | "DAGDEEL" | "DAG";
    gebruiktAccountArbeidTarief: boolean;
    arbeidTariefUur: number;
    arbeidTariefDagdeel: number;
    arbeidTariefDag: number;
    arbeidAfronden: boolean;
    transportEnabled: boolean;
    transportTarief: number;
    voorrijEnabled: boolean;
    gebruiktAccountVoorrijTarief: boolean;
    voorrijTarief: number;
    materiaalEnabled: boolean;
    gebruiktAccountBtw: boolean;
    btwPercentage: number;
    bandbreedteModus: "GEEN" | "PER_PRODUCT" | "TOTAAL";
    bandbreedteMargeOmlaag: number;
    bandbreedteMargeOmhoog: number;
  };
  products: RegressieProduct[];
  // Het opgeslagen configuratie-object van een formule-gebaseerde ("Aangepaste") rekentool, of null.
  calculatorConfig: unknown | null;
};

export type Oorzaak = "gelijk" | "afronding per regel (bewust)" | "ONDERZOEKEN";

export type RegressieRij = {
  toolId: string;
  tool: string;
  bedrijf: string;
  type: "onderdelen" | "formules";
  scenario: string;
  oudCenten: number;
  nieuwCenten: number;
  verschilCenten: number;
  oorzaak: Oorzaak;
  toelichting: string;
};

const cent = (euro: number) => Math.round(euro * 100);
const bovengrens = (b: number | { min: number; max: number }) => (typeof b === "number" ? b : b.max);

function actieveProducten(t: RegressieTool) {
  return t.products
    .filter((p) => p.actief !== false)
    .map((p) => ({
      ...p,
      materiaalCategorieen: p.materiaalCategorieen.map((c) => ({ ...c, materialen: c.materialen.filter((m) => m.actief !== false) })),
      extraOpties: p.extraOpties.filter((e) => e.actief !== false),
    }));
}

// Een voorbeeldhoeveelheid per onderdeel, in de eenheid van het onderdeel, via het sjabloon.
function monsterInvoer(p: ReturnType<typeof actieveProducten>[number], q: number): { sjabloonInvoer?: Record<string, unknown>; hoeveelheid?: number } {
  switch (p.sjabloon ?? "ENKELE_HOEVEELHEID") {
    case "AFMETINGEN":
      return { sjabloonInvoer: { lengte: q, breedte: 1, diepte: 0.1 } };
    case "RUIMTES":
      return { sjabloonInvoer: { ruimtes: [{ naam: "Ruimte", lengte: q, breedte: 3, hoogte: 2.5, aftrek: 2.5 }] } };
    case "ARTIKELREGELS": {
      const types = ((p.sjabloonConfig as { artikelTypes?: { id: string }[] } | null)?.artikelTypes ?? []).slice(0, 2);
      return { sjabloonInvoer: { regels: types.map((a) => ({ artikelTypeId: a.id, aantal: Math.max(1, Math.round(q / 10)), breedte: 1, hoogte: 1 })) } };
    }
    default:
      return { hoeveelheid: q };
  }
}

type Scenario = { naam: string; producten: ReturnType<typeof actieveProducten>; mand: { id: string; q: number }[]; keuze: "eerste" | "laatste"; extras: boolean };

function maakScenarios(t: RegressieTool): Scenario[] {
  const producten = actieveProducten(t);
  const scenarios: Scenario[] = [];
  for (const p of producten) {
    for (const q of [1, 7.5, 20, 60, 250]) scenarios.push({ naam: `${p.naam}: ${q} ${p.eenheid}`, producten: [p], mand: [{ id: p.id, q }], keuze: "eerste", extras: false });
    if (p.materiaalCategorieen.some((c) => c.materialen.length > 1)) scenarios.push({ naam: `${p.naam}: 20 ${p.eenheid}, andere materiaalkeuze`, producten: [p], mand: [{ id: p.id, q: 20 }], keuze: "laatste", extras: false });
    if (p.extraOpties.length > 0) scenarios.push({ naam: `${p.naam}: 20 ${p.eenheid}, met extra's`, producten: [p], mand: [{ id: p.id, q: 20 }], keuze: "eerste", extras: true });
  }
  if (producten.length > 1) scenarios.push({ naam: `Alle onderdelen samen: 10 van elk`, producten, mand: producten.map((p) => ({ id: p.id, q: 10 })), keuze: "eerste", extras: true });
  return scenarios;
}

function onderdelenRij(t: RegressieTool, s: Scenario): RegressieRij {
  const kosten = resolveCostSettings(t.costSettings, t.company);
  const materiaalKeuzes: Record<string, string> = {};
  const extraKeuzes: Record<string, number> = {};
  for (const p of s.producten) {
    for (const c of p.materiaalCategorieen) {
      const m = s.keuze === "eerste" ? c.materialen[0] : c.materialen[c.materialen.length - 1];
      if (m) materiaalKeuzes[c.id] = m.id;
    }
    if (s.extras) for (const e of p.extraOpties) if (!e.altijd) extraKeuzes[e.id] = e.type === "PER_STUK" ? 2 : 1;
  }

  // Nieuw: de rekenkern, met de ruwe invoer van de klant.
  const hoeveelheden: Record<string, number> = {};
  const sjabloonInvoer: Record<string, Record<string, unknown>> = {};
  for (const m of s.mand) {
    const p = s.producten.find((x) => x.id === m.id)!;
    const inv = monsterInvoer(p, m.q);
    if (inv.hoeveelheid !== undefined) hoeveelheden[p.id] = inv.hoeveelheid;
    if (inv.sjabloonInvoer) sjabloonInvoer[p.id] = inv.sjabloonInvoer;
  }
  const nieuw = berekenPrijs(configVanProducten(s.producten, kosten), invoerVanKlant({ producten: s.producten, hoeveelheden, sjabloonInvoer, materiaalKeuzes, extraKeuzes }));

  // Oud: dezelfde invoer via de oude berekening (hoeveelheid en artikelbedrag eerst via het sjabloon).
  const productQty: Record<string, number> = {};
  const productRegelsBedrag: Record<string, number> = {};
  for (const m of s.mand) {
    const p = s.producten.find((x) => x.id === m.id)!;
    if (!p.sjabloon || p.sjabloon === "ENKELE_HOEVEELHEID") {
      productQty[p.id] = hoeveelheden[p.id];
      continue;
    }
    const config = (p.sjabloonConfig as Record<string, unknown> | null) ?? {};
    const invoer = coerceVeldWaarden(klantVeldenVoorSjabloon(p.sjabloon, config), sjabloonInvoer[p.id] ?? {});
    const res = berekenHoeveelheidVoorSjabloon(p.sjabloon, config, invoer);
    if (res.soort === "hoeveelheid") productQty[p.id] = res.waarde;
    else {
      productQty[p.id] = hoeveelheidUitResultaat(res);
      productRegelsBedrag[p.id] = res.regels.reduce((som, r) => som + r.aantal * r.prijsPerEenheid, 0);
    }
  }
  const oud: OudRange = oudBerekenRange({ products: s.producten as never, productQty, productRegelsBedrag, materialSelections: materiaalKeuzes, extraSelections: extraKeuzes, costSettings: kosten });

  const oudCenten = cent(bovengrens(oud.totaal));
  const nieuwCenten = nieuw.bandbreedte ? nieuw.bandbreedte.max.totaalInclCenten : nieuw.totaalInclCenten;
  return rij(t, "onderdelen", s.naam, oudCenten, nieuwCenten, nieuw.regels.length, "");
}

function rij(t: RegressieTool, type: RegressieRij["type"], scenario: string, oudCenten: number, nieuwCenten: number, aantalRegels: number, toelichting: string): RegressieRij {
  const verschil = nieuwCenten - oudCenten;
  // Elke regel wordt op hele centen afgerond (maximaal een halve cent) en de btw per regel ook: de marge is
  // dus maximaal een cent per regel plus de afronding van het eindtotaal.
  const marge = Math.ceil(aantalRegels * 1.0 + 1);
  const oorzaak: Oorzaak = verschil === 0 ? "gelijk" : Math.abs(verschil) <= marge ? "afronding per regel (bewust)" : "ONDERZOEKEN";
  return { toolId: t.id, tool: t.naam, bedrijf: t.bedrijf, type, scenario, oudCenten, nieuwCenten, verschilCenten: verschil, oorzaak, toelichting };
}

// ── formule-gebaseerde rekentools ──

function monsterWaarden(config: AnyCalculatorConfigData, t: RegressieTool, factor: number): Record<string, unknown> {
  const eersteMateriaal: Record<string, string> = {};
  for (const p of t.products) for (const c of p.materiaalCategorieen) if (c.materialen[0]) eersteMateriaal[c.id] = c.materialen[0].id;
  const waarden: Record<string, unknown> = {};
  const vul = (sleutelVoor: (veldId: string) => string, velden: ReturnType<typeof alleVeldenVanConfig>) => {
    for (const veld of velden) {
      const sleutel = sleutelVoor(veld.id);
      switch (veld.soort) {
        case "NUMMER":
        case "AANTAL":
        case "OPPERVLAKTE":
        case "SLIDER": {
          const basis = veld.standaardWaarde ?? Math.min(Math.max(10, veld.min ?? 0), veld.max ?? 1e6);
          waarden[sleutel] = Math.min(Math.max(basis * factor, veld.min ?? 0), veld.max ?? 1e6);
          break;
        }
        case "JA_NEE":
        case "CHECKBOX":
          waarden[sleutel] = true;
          break;
        case "DROPDOWN":
        case "RADIO":
          waarden[sleutel] = veld.opties[0]?.waarde ?? "";
          break;
        case "MEERKEUZE":
          waarden[sleutel] = veld.opties.slice(0, 1).map((o) => o.waarde);
          break;
        case "AFMETINGEN":
          waarden[sleutel] = { lengte: 6 * factor, breedte: 4, hoogte: 2 };
          break;
        case "PRODUCT_KEUZE":
          waarden[sleutel] = eersteMateriaal[veld.materialCategoryId] ?? "";
          break;
        default:
          waarden[sleutel] = "";
      }
    }
  };
  if (config.versie === 2) for (const o of config.onderdelen.filter((x) => x.actief)) vul((id) => `${o.id}::${id}`, o.velden);
  else vul((id) => id, config.velden);
  return waarden;
}

function formulesRijen(t: RegressieTool): RegressieRij[] {
  if (!t.calculatorConfig) return [];
  const config = publicCalculatorConfig(parseCalculatorConfig(t.calculatorConfig));
  const kosten = resolveCostSettings(t.costSettings, t.company);
  const materiaalPrijzen: Record<string, number> = {};
  for (const p of t.products) for (const c of p.materiaalCategorieen) for (const m of c.materialen) materiaalPrijzen[m.id] = m.prijs;
  const rijen: RegressieRij[] = [];
  for (const [naam, factor] of [["voorbeeldinvoer", 1], ["driemaal zoveel", 3]] as const) {
    const waarden = monsterWaarden(config, t, factor);
    const nieuw = berekenModulair({ config, waarden, materiaalPrijzen, btwPercentage: kosten.btwPercentage });
    // Oud: dezelfde regels, het oude resultaatmodel (btw over het afgeronde subtotaal).
    const evaluatie = nieuw.evaluatie;
    const oud = oudResultaat(evaluatie, { btwPercentage: kosten.btwPercentage, resultaatInstellingen: config.resultaatInstellingen, heeftGeldigeInvoer: nieuw.heeftGeldigeInvoer });
    const nieuwR = nieuwResultaat(evaluatie, { btwPercentage: kosten.btwPercentage, resultaatInstellingen: config.resultaatInstellingen, heeftGeldigeInvoer: nieuw.heeftGeldigeInvoer });
    rijen.push(rij(t, "formules", `Aangepaste rekentool: ${naam}`, cent(oud.totaal), cent(nieuwR.totaal), evaluatie.lineItems.length, `${evaluatie.lineItems.length} regels`));
  }
  return rijen;
}

export function regressieVoorTool(t: RegressieTool): RegressieRij[] {
  const rijen: RegressieRij[] = [];
  if (t.calculatorConfig) return formulesRijen(t);
  for (const s of maakScenarios(t)) rijen.push(onderdelenRij(t, s));
  return rijen;
}

// Wat het rapport verder meldt over de vorm van de rekentools (geen prijsverschil, wel van belang).
export type ToolKenmerken = {
  tool: string;
  bedrijf: string;
  onderdelen: number;
  meerdereCategorieen: number;
  vasteKostenPerOnderdeel: boolean;
  bandbreedte: string;
  formules: boolean;
};

export function kenmerkenVan(t: RegressieTool): ToolKenmerken {
  const p = actieveProducten(t);
  const kosten = resolveCostSettings(t.costSettings, t.company);
  const heeftVast = p.filter((x) => (kosten.voorrijEnabled && (x.voorrijkostenOverride ?? kosten.voorrijTarief) > 0 && !x.voorrijMeeschalend) || (kosten.transportEnabled && (x.transportkostenOverride ?? kosten.transportTarief) > 0 && !x.transportMeeschalend && !x.transportPerDag)).length;
  return {
    tool: t.naam,
    bedrijf: t.bedrijf,
    onderdelen: p.length,
    meerdereCategorieen: p.filter((x) => x.materiaalCategorieen.length > 1).length,
    vasteKostenPerOnderdeel: heeftVast > 1,
    bandbreedte: t.costSettings.bandbreedteModus,
    formules: Boolean(t.calculatorConfig),
  };
}

export function samenvatting(rijen: RegressieRij[]) {
  const tel = (o: Oorzaak) => rijen.filter((r) => r.oorzaak === o).length;
  return { totaal: rijen.length, gelijk: tel("gelijk"), afronding: tel("afronding per regel (bewust)"), onderzoeken: tel("ONDERZOEKEN") };
}
