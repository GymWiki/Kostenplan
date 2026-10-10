import type {
  CalculatorField,
  DerivedVariable,
  Expression,
  ModulaireCalculatorConfigData,
  OnderdeelConfig,
  PriceRule,
} from "@/app/lib/calculator-engine";
import { afmetingenSubvariabelen, legeModulaireCalculatorConfig, productKeuzePrijsVariabele } from "@/app/lib/calculator-engine";
import { parseGetal } from "@/app/lib/sjablonen";
import type { WerkzaamheidDraft } from "@/app/lib/werkzaamheid";
import { kortEenheid, methodeNaarInstelling } from "@/app/lib/werkzaamheid";

// Vertaalt een werkzaamheid (de simpele laag) naar de bestaande engine-
// structuur: een Onderdeel met velden, afgeleide variabelen en prijsregels.
// Puur en zonder database. Doel: bewijzen (tests) dat het standaardmodel
// exact hetzelfde totaal geeft als de huidige motor (calculate.ts), en een
// brug naar de engine voor de dag dat dat nodig is. Opslag blijft Product.
//
// Wat de engine NIET kan uitdrukken wordt teruggegeven in `beperkingen`:
// transport per dag (er is geen "naar boven afronden" in een expressie),
// afronden van arbeid, bandbreedte per materiaal (min/max) en stapgrootte.

export type EngineTarieven = {
  materiaalEnabled: boolean;
  arbeidEnabled: boolean;
  // Tarief per arbeidseenheid (dagdeel, dag of uur).
  arbeidTarief: number;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  transportEnabled: boolean;
  transportTarief: number;
};

export type WerkzaamheidVoorEngine = {
  id: string;
  draft: WerkzaamheidDraft;
  icoon?: string;
  order?: number;
  // Categorie waar PRODUCT_KEUZE naar verwijst (de materialen).
  materialCategoryId: string;
  // Productspecifieke afwijkingen die het standaardmodel niet kent maar wel
  // bestaan (alleen gebruikt voor de equivalentietests).
  arbeidAfronden?: boolean;
};

const GETAL = (waarde: number): Expression => ({ kind: "GETAL", waarde });
const VAR = (naam: string): Expression => ({ kind: "VARIABELE", naam });

const veiligeId = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_");

export const MATERIAAL_VELD_ID = "materiaal";
export const TEMPO_VARIABELE = "tempo";

export function hoeveelheidVariabele(w: Pick<WerkzaamheidVoorEngine, "draft">): string {
  return w.draft.methode === "LENGTE_BREEDTE" ? afmetingenSubvariabelen("afmeting", false).oppervlakte : "hoeveelheid";
}

export function extraVeldId(sleutel: string) {
  return `extra_${veiligeId(sleutel)}`;
}

type BasisSleutels = "id" | "label" | "categorie" | "voorwaarde" | "actief" | "toonInUitsplitsing" | "intern";
type RegelRest = PriceRule extends infer R ? (R extends PriceRule ? Omit<R, BasisSleutels> : never) : never;

function regel(
  basis: { id: string; label: string; categorie: PriceRule["categorie"]; voorwaarde?: Expression },
  rest: RegelRest
): PriceRule {
  return { ...basis, actief: true, toonInUitsplitsing: true, intern: false, ...rest } as PriceRule;
}

export function werkzaamheidNaarOnderdeel(
  w: WerkzaamheidVoorEngine,
  tarieven: EngineTarieven,
  { metVasteKosten = false }: { metVasteKosten?: boolean } = {}
): { onderdeel: OnderdeelConfig; beperkingen: string[] } {
  const { draft } = w;
  if (!draft.methode) throw new Error("Een onderdeel zonder rekenmethode past niet in het standaardmodel.");
  const eenheid = kortEenheid(methodeNaarInstelling(draft.methode).eenheid);
  const Q = hoeveelheidVariabele(w);
  const beperkingen: string[] = [];
  if (draft.transportPerDag) beperkingen.push("transport per dag");
  if (w.arbeidAfronden) beperkingen.push("arbeid afronden");
  if (draft.bandbreedte) beperkingen.push("bandbreedte per materiaal");

  // --- Velden
  const velden: CalculatorField[] = [];
  switch (draft.methode) {
    case "METER":
      velden.push({ id: "hoeveelheid", label: "Hoeveel meter?", soort: "NUMMER", eenheid: "m", verplicht: true, min: 0 });
      break;
    case "M2":
      velden.push({ id: "hoeveelheid", label: "Hoeveel m²?", soort: "OPPERVLAKTE", eenheid: "m²", verplicht: true, min: 0 });
      break;
    case "STUK":
      velden.push({ id: "hoeveelheid", label: "Hoeveel stuks?", soort: "AANTAL", verplicht: true, min: 0 });
      break;
    case "LENGTE_BREEDTE":
      velden.push({ id: "afmeting", label: "Afmetingen", soort: "AFMETINGEN", eenheid: "meter", metHoogte: false, verplicht: true });
      break;
  }
  velden.push({
    id: MATERIAAL_VELD_ID,
    label: "Kies je materiaal",
    soort: "PRODUCT_KEUZE",
    materialCategoryId: w.materialCategoryId,
    verplicht: true,
  });
  const extras = draft.extras ?? [];
  for (const e of extras) {
    if (e.altijd) continue;
    const id = extraVeldId(e.sleutel);
    velden.push(
      e.type === "PER_STUK"
        ? { id, label: e.naam, soort: "AANTAL", verplicht: false, min: 0 }
        : { id, label: e.naam, soort: "JA_NEE", verplicht: false }
    );
  }

  // --- Afgeleide variabelen: werktempo (per materiaal anders als dat aan staat)
  const standaardTempo = parseGetal(draft.productiviteit, 0);
  let tempo: Expression = GETAL(standaardTempo);
  if (draft.werktempoPerMateriaal) {
    for (const m of [...draft.materialen].reverse()) {
      const eigen = parseGetal(m.productiviteitOverride, 0);
      if (eigen > 0) {
        tempo = {
          kind: "ALS_DAN",
          voorwaarde: { kind: "GELIJK_AAN", links: VAR(MATERIAAL_VELD_ID), rechts: { kind: "TEKST", waarde: m.id ?? m.sleutel } },
          dan: GETAL(eigen),
          anders: tempo,
        };
      }
    }
  }
  const afgeleideVariabelen: DerivedVariable[] =
    standaardTempo > 0 || draft.werktempoPerMateriaal
      ? [{ id: TEMPO_VARIABELE, label: `Werktempo (${eenheid} per dagdeel)`, type: "NUMBER", expression: tempo }]
      : [];

  // --- Prijsregels (volgorde: materiaal, arbeid, extra's, toeslagen, vaste kosten)
  const regels: PriceRule[] = [];
  if (tarieven.materiaalEnabled) {
    regels.push(
      regel(
        { id: "materiaal", label: "Materiaal", categorie: "MATERIAAL" },
        { type: "PER_EENHEID", hoeveelheid: VAR(Q), prijsPerEenheid: VAR(productKeuzePrijsVariabele(MATERIAAL_VELD_ID)), eenheid }
      )
    );
  }
  if (tarieven.arbeidEnabled && afgeleideVariabelen.length > 0) {
    regels.push(
      regel(
        { id: "arbeid", label: "Arbeid", categorie: "ARBEID", voorwaarde: { kind: "GROTER_DAN", links: VAR(TEMPO_VARIABELE), rechts: GETAL(0) } },
        {
          type: "FORMULE",
          formule: { kind: "VERMENIGVULDIGEN", factoren: [{ kind: "DELEN", links: VAR(Q), rechts: VAR(TEMPO_VARIABELE) }, GETAL(tarieven.arbeidTarief)] },
        }
      )
    );
  }
  for (const e of extras) {
    const prijs = parseGetal(e.prijs, 0);
    const id = `extra-${veiligeId(e.sleutel)}`;
    if (e.altijd) {
      regels.push(
        e.type === "PER_STUK"
          ? regel({ id, label: e.naam, categorie: "TOESLAG" }, { type: "TOESLAG", bedrag: GETAL(prijs) })
          : regel({ id, label: e.naam, categorie: "TOESLAG" }, { type: "PER_EENHEID", hoeveelheid: VAR(Q), prijsPerEenheid: GETAL(prijs), eenheid })
      );
    } else if (e.type === "PER_STUK") {
      regels.push(
        regel({ id, label: e.naam, categorie: "TOESLAG" }, { type: "PER_EENHEID", hoeveelheid: VAR(extraVeldId(e.sleutel)), prijsPerEenheid: GETAL(prijs), eenheid: "stuk" })
      );
    } else {
      regels.push(
        regel(
          { id, label: e.naam, categorie: "TOESLAG", voorwaarde: VAR(extraVeldId(e.sleutel)) },
          { type: "PER_EENHEID", hoeveelheid: VAR(Q), prijsPerEenheid: GETAL(prijs), eenheid }
        )
      );
    }
  }
  if (metVasteKosten) regels.push(...vasteKostenRegels(tarieven));

  return {
    onderdeel: {
      id: w.id,
      naam: draft.naam,
      icoon: w.icoon,
      actief: true,
      order: w.order ?? 0,
      velden,
      afgeleideVariabelen,
      regels,
    },
    beperkingen,
  };
}

// Voorrijkosten en transport: één keer per aanvraag, uit de algemene tarieven.
export function vasteKostenRegels(t: EngineTarieven): PriceRule[] {
  const r: PriceRule[] = [];
  if (t.voorrijEnabled) r.push(regel({ id: "voorrijkosten", label: "Voorrijkosten", categorie: "TRANSPORT" }, { type: "VAST", bedrag: GETAL(t.voorrijTarief) }));
  if (t.transportEnabled) r.push(regel({ id: "transport", label: "Transport", categorie: "TRANSPORT" }, { type: "VAST", bedrag: GETAL(t.transportTarief) }));
  return r;
}

// Een hele rekentool: elke werkzaamheid een onderdeel, plus één onderdeel
// "Vaste kosten" zodat voorrij en transport maar één keer per aanvraag tellen.
export function werkzaamhedenNaarConfig(
  werkzaamheden: WerkzaamheidVoorEngine[],
  tarieven: EngineTarieven
): { config: ModulaireCalculatorConfigData; beperkingen: Record<string, string[]> } {
  const config = legeModulaireCalculatorConfig("PROJECT");
  const beperkingen: Record<string, string[]> = {};
  werkzaamheden.forEach((w, i) => {
    const r = werkzaamheidNaarOnderdeel({ ...w, order: i }, tarieven);
    config.onderdelen.push(r.onderdeel);
    if (r.beperkingen.length > 0) beperkingen[w.id] = r.beperkingen;
  });
  config.onderdelen.push({
    id: "vaste-kosten",
    naam: "Vaste kosten",
    actief: true,
    order: werkzaamheden.length,
    velden: [],
    afgeleideVariabelen: [],
    regels: vasteKostenRegels(tarieven),
  });
  return { config, beperkingen };
}
