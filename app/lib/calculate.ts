export type ArbeidStapEenheid = "UUR" | "DAGDEEL" | "DAG";

export type CalcCostSettings = {
  arbeidEnabled: boolean;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTariefUur: number;
  arbeidTariefDagdeel: number;
  arbeidTariefDag: number;
  // Rond de arbeidstijd van een product af op hele arbeidStapEenheid-stappen
  // i.p.v. 'm continu (lineair) door te rekenen. Uit = continu (standaard).
  arbeidAfronden: boolean;
  transportEnabled: boolean;
  transportTarief: number;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  materiaalEnabled: boolean;
  btwPercentage: number;
  bandbreedteModus: BandbreedteModus;
  bandbreedteMargeOmlaag: number;
  bandbreedteMargeOmhoog: number;
};

export type PrijsType = "VAST" | "BANDBREEDTE";
export type BandbreedteModus = "GEEN" | "PER_PRODUCT" | "TOTAAL";

export type CalcMaterialOption = {
  id: string;
  naam: string;
  // Volledige verkoopprijs per eenheid — inclusief de marge van de vakman.
  // Geen aparte opslaglaag meer (zie CostSettings).
  prijs: number;
  prijsType: PrijsType;
  prijsMin: number | null;
  prijsMax: number | null;
  stapgrootte: number | null;
  // Vervangt Product.productiviteit voor dit materiaal (bijv. natuursteen
  // legt trager dan betontegel). Leeg = gebruik de productiviteit van het
  // product. Geldt alleen voor de eerste (primaire) materiaalcategorie van
  // een product — zie primaireGeselecteerdeOptie() hieronder.
  productiviteitOverride: number | null;
};

export type CalcMaterialCategory = {
  id: string;
  naam: string;
  materialen: CalcMaterialOption[];
};

export type CalcExtraOption = {
  id: string;
  prijs: number;
  type: "PER_EENHEID" | "PER_STUK";
};

export type CalcProduct = {
  id: string;
  // Kostenopbouw — vier blokken. Materiaal loopt via materiaalCategorieen
  // hieronder (blok 1), de rest hier (blok 2-4). Zie berekenProductKosten().
  productiviteit: number | null;
  arbeidTariefOverride: number | null;
  transportkostenOverride: number | null;
  transportMeeschalend: boolean;
  voorrijkostenOverride: number | null;
  voorrijMeeschalend: boolean;
  materiaalCategorieen: CalcMaterialCategory[];
  extraOpties: CalcExtraOption[];
};

// Rounds to 6 decimals before taking the ceiling, so floating-point noise
// (e.g. 2.9999999999) doesn't push a value up to the next whole step.
function ceilStep(value: number) {
  return Math.ceil(Math.round(value * 1e6) / 1e6);
}

// Rounds a quantity up to the nearest multiple of `step` (used for
// materials that are only sold in fixed bundles, e.g. per 1.8 m).
function roundUpToStep(qty: number, step: number) {
  return ceilStep(qty / step) * step;
}

// Welk van de drie company-tarieven geldt voor de huidige arbeidStapEenheid
// — zie CostSettings.arbeidTariefUur/Dagdeel/Dag (drie losse velden i.p.v.
// één, zodat wisselen van arbeidStapEenheid nooit een bestaand tarief
// herinterpreteert als een bedrag voor een andere tijdseenheid).
export function arbeidTariefVoorStapEenheid(
  costSettings: Pick<CalcCostSettings, "arbeidTariefUur" | "arbeidTariefDagdeel" | "arbeidTariefDag">,
  stapEenheid: ArbeidStapEenheid
): number {
  if (stapEenheid === "UUR") return costSettings.arbeidTariefUur;
  if (stapEenheid === "DAGDEEL") return costSettings.arbeidTariefDagdeel;
  return costSettings.arbeidTariefDag;
}

// Materiaalcategorieën met precies één (actieve) optie hebben niets te
// kiezen — die optie telt automatisch mee, zonder dat de klant iets hoeft
// te selecteren. Dit is hoe de vroegere "basisprijs" (een los, handmatig
// ingevuld Product.prijsPerEenheid) zich nu gedraagt: gewoon een
// materiaalcategorie met exact 1 optie. `materialen` bevat hier al alleen
// actieve opties (gefilterd door de Prisma-query die dit aanroept).
export function geselecteerdeMateriaalOptieId(
  category: CalcMaterialCategory,
  materialSelections: Record<string, string>
): string | null {
  if (category.materialen.length === 1) return category.materialen[0].id;
  return materialSelections[category.id] ?? null;
}

export type MateriaalRegel = {
  categorieId: string;
  categorieNaam: string;
  optieId: string;
  optieNaam: string;
  // Effectieve hoeveelheid ván déze regel — gelijk aan de hoofdhoeveelheid,
  // tenzij de gekozen optie een stapgrootte heeft (dan naar boven afgerond
  // op een veelvoud daarvan, bijv. palen per 1,8 m). Dat is de enige manier
  // waarop een categorie een van de hoofdhoeveelheid afwijkende hoeveelheid
  // kan hebben.
  hoeveelheid: number;
  prijsPerEenheid: number;
  bedrag: number;
};

// Som van alle materiaalcategorieën van een product, elk met de daar
// geselecteerde (of bij precies 1 optie: automatisch gekozen) optie — één
// regel per categorie, nooit alleen de eerste. Gedeeld door
// calculateBreakdown() hieronder (de motor achter de mandje-berekening) en
// door het bewerkscherm/de wizard voor het live voorbeeld
// (KostenUitsplitsing), zodat een categorie nooit op de ene plek wél en op
// de andere plek niet meetelt.
//
// `valtTerugOpEersteOptie`: alleen voor het vakman-voorbeeld — daar is geen
// klant die kiest, dus previewen we een categorie zonder eenduidige keuze
// met de eerste optie in plaats van 'm over te slaan. De echte
// klant-berekening (calculateBreakdown) gebruikt dit nooit: een categorie
// zonder keuze telt daar terecht niet mee (zie heeftOntbrekendeVerplichteMaterialen).
export function berekenMateriaalRegels(
  categorieen: CalcMaterialCategory[],
  hoeveelheid: number,
  materialSelections: Record<string, string>,
  { valtTerugOpEersteOptie = false }: { valtTerugOpEersteOptie?: boolean } = {}
): { regels: MateriaalRegel[]; totaal: number; primaireOptie: CalcMaterialOption | undefined } {
  const regels: MateriaalRegel[] = [];
  let primaireOptie: CalcMaterialOption | undefined;

  categorieen.forEach((categorie, index) => {
    const selectedId =
      geselecteerdeMateriaalOptieId(categorie, materialSelections) ??
      (valtTerugOpEersteOptie ? (categorie.materialen[0]?.id ?? null) : null);
    if (!selectedId) return;
    const optie = categorie.materialen.find((m) => m.id === selectedId);
    if (!optie) return;
    if (index === 0) primaireOptie = optie;

    const effectieveHoeveelheid =
      optie.stapgrootte && optie.stapgrootte > 0 ? roundUpToStep(hoeveelheid, optie.stapgrootte) : hoeveelheid;
    const bedrag = effectieveHoeveelheid * optie.prijs;
    regels.push({
      categorieId: categorie.id,
      categorieNaam: categorie.naam,
      optieId: optie.id,
      optieNaam: optie.naam,
      hoeveelheid: effectieveHoeveelheid,
      prijsPerEenheid: optie.prijs,
      bedrag,
    });
  });

  return { regels, totaal: regels.reduce((som, regel) => som + regel.bedrag, 0), primaireOptie };
}

export type ProductKostenBlokken = {
  materiaal: number;
  arbeid: number;
  transport: number;
  voorrijkosten: number;
  totaal: number;
};

// Het volledige, eigen bedrag van één product binnen de mandje-berekening
// (materiaal + arbeid + transport + voorrijkosten van dát product, dus al
// meegeteld in calculateBreakdown()'s totalen hieronder — dit is puur de
// per-product uitsplitsing daarvan). Gebruikt om offerteregels een eigen,
// eerlijke prijs per eenheid te geven in plaats van dat het hele
// productbedrag in één generieke restpost verdwijnt — zie
// prefillOfferteRegels() in app/lib/offertes.ts.
export type ProductRegel = {
  productId: string;
  aantal: number;
  prijsPerEenheid: number;
  totaal: number;
};

// De kern van het nieuwe rekenmodel: de vier kostenblokken van één product,
// in isolatie. Gedeeld door calculateBreakdown() hieronder (de motor achter
// de volledige mandje-berekening) én rechtstreeks door de wizard/het
// bewerkscherm voor het live voorbeeld — dezelfde formule, geen tweede
// implementatie.
//
//   schalend deel = (materiaalkosten + arbeidskosten [+transport][+voorrij]) × hoeveelheid
//   vaste posten  = transport en/of voorrijkosten die niet meeschalen
//   totaalprijs   = schalend deel + vaste posten
//
// `materiaalkosten` komt hier al kant-en-klaar (in euro's, dus al × hoeveelheid
// en eventuele stapgrootte-afronding verwerkt) binnen — dat gebeurt per
// materiaalcategorie vóór deze aanroep, zie calculateBreakdown().
export function berekenProductKosten({
  materiaalkosten,
  materiaalEnabled,
  hoeveelheid,
  productiviteit,
  arbeidTarief,
  arbeidEnabled,
  arbeidAfronden,
  transportBedrag,
  transportMeeschalend,
  transportEnabled,
  voorrijBedrag,
  voorrijMeeschalend,
  voorrijEnabled,
}: {
  materiaalkosten: number;
  materiaalEnabled: boolean;
  hoeveelheid: number;
  productiviteit: number | null;
  arbeidTarief: number;
  arbeidEnabled: boolean;
  arbeidAfronden: boolean;
  transportBedrag: number;
  transportMeeschalend: boolean;
  transportEnabled: boolean;
  voorrijBedrag: number;
  voorrijMeeschalend: boolean;
  voorrijEnabled: boolean;
}): ProductKostenBlokken {
  const materiaal = materiaalEnabled ? materiaalkosten : 0;

  let arbeid = 0;
  if (arbeidEnabled && productiviteit != null && productiviteit > 0) {
    const arbeidstijd = hoeveelheid / productiviteit;
    arbeid = (arbeidAfronden ? ceilStep(arbeidstijd) : arbeidstijd) * arbeidTarief;
  }

  const transport = transportEnabled
    ? transportMeeschalend
      ? hoeveelheid * transportBedrag
      : transportBedrag
    : 0;
  const voorrijkosten = voorrijEnabled
    ? voorrijMeeschalend
      ? hoeveelheid * voorrijBedrag
      : voorrijBedrag
    : 0;

  return { materiaal, arbeid, transport, voorrijkosten, totaal: materiaal + arbeid + transport + voorrijkosten };
}

export function calculateBreakdown({
  products,
  productQty,
  productRegelsBedrag = {},
  materialSelections,
  extraSelections,
  costSettings,
}: {
  products: CalcProduct[];
  productQty: Record<string, number>;
  // Alleen voor sjabloon ARTIKELREGELS (zie sjablonen.ts): elke regel heeft
  // een eigen prijs, dus geen los qty × materiaalprijs — de klant-kant heeft
  // de som van alle regelbedragen al berekend (SjabloonResultaat soort
  // "regels") en geeft die hier per product-id mee, los van productQty (dat
  // voor dit sjabloon wél gebruikt blijft, maar dan voor arbeidskosten: de
  // totale hoeveelheid over alle regels heen).
  productRegelsBedrag?: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  costSettings: CalcCostSettings;
}) {
  let arbeidskosten = 0;
  let materiaalkosten = 0;
  let transportkosten = 0;
  let voorrijkosten = 0;
  let itemCount = 0;
  const productRegels: ProductRegel[] = [];

  for (const product of products) {
    const qty = productQty[product.id] ?? 0;
    const regelsBedrag = productRegelsBedrag[product.id] ?? 0;
    if (qty <= 0 && regelsBedrag <= 0) continue;
    itemCount += 1;

    // Materiaalkosten (blok 1) — som over alle categorieën. De eerste
    // (primaire) categorie levert ook de eventuele productiviteitOverride
    // voor blok 2 hieronder — "productiviteit kan per materiaal afwijken".
    const { totaal: materiaalCategorieenTotaal, primaireOptie } = berekenMateriaalRegels(
      product.materiaalCategorieen,
      qty,
      materialSelections
    );
    let productMateriaalkosten = materiaalCategorieenTotaal;

    for (const extra of product.extraOpties) {
      const aantal = extraSelections[extra.id] ?? 0;
      if (aantal <= 0) continue;
      productMateriaalkosten += (extra.type === "PER_STUK" ? aantal : qty) * extra.prijs;
    }

    if (regelsBedrag > 0) {
      productMateriaalkosten += regelsBedrag;
    }

    const productiviteit = primaireOptie?.productiviteitOverride ?? product.productiviteit;
    const arbeidTarief =
      product.arbeidTariefOverride ?? arbeidTariefVoorStapEenheid(costSettings, costSettings.arbeidStapEenheid);
    const transportBedrag = product.transportkostenOverride ?? costSettings.transportTarief;
    const voorrijBedrag = product.voorrijkostenOverride ?? costSettings.voorrijTarief;

    const kosten = berekenProductKosten({
      materiaalkosten: productMateriaalkosten,
      materiaalEnabled: costSettings.materiaalEnabled,
      hoeveelheid: qty,
      productiviteit,
      arbeidTarief,
      arbeidEnabled: costSettings.arbeidEnabled,
      arbeidAfronden: costSettings.arbeidAfronden,
      transportBedrag,
      transportMeeschalend: product.transportMeeschalend,
      transportEnabled: costSettings.transportEnabled,
      voorrijBedrag,
      voorrijMeeschalend: product.voorrijMeeschalend,
      voorrijEnabled: costSettings.voorrijEnabled,
    });

    materiaalkosten += kosten.materiaal;
    arbeidskosten += kosten.arbeid;
    transportkosten += kosten.transport;
    voorrijkosten += kosten.voorrijkosten;

    productRegels.push({
      productId: product.id,
      aantal: qty,
      prijsPerEenheid: qty > 0 ? kosten.totaal / qty : 0,
      totaal: kosten.totaal,
    });
  }

  const heeftSelectie = itemCount > 0;
  const subtotaal = arbeidskosten + materiaalkosten + transportkosten + voorrijkosten;
  const btw = subtotaal * (costSettings.btwPercentage / 100);
  const totaal = subtotaal + btw;

  return {
    arbeidskosten,
    materiaalkosten,
    transportkosten,
    voorrijkosten,
    subtotaal,
    btw,
    totaal,
    heeftSelectie,
    productRegels,
  };
}

export type Bedrag = number | { min: number; max: number };

export type BreakdownRange = {
  modus: BandbreedteModus;
  arbeidskosten: Bedrag;
  materiaalkosten: Bedrag;
  transportkosten: Bedrag;
  voorrijkosten: Bedrag;
  subtotaal: Bedrag;
  btw: Bedrag;
  totaal: Bedrag;
  heeftSelectie: boolean;
  // Alleen gezet bij modus TOTAAL, voor weergave van de gehanteerde marge
  // (bijv. "indicatie −10% / +15%").
  margeOmlaag?: number;
  margeOmhoog?: number;
  // Altijd het MIDDEN-scenario (ongeacht modus) — voor plekken die per
  // product één vast getal nodig hebben, zoals de lead-snapshot/offerte-
  // regels, die zelf nooit een bandbreedte tonen.
  productRegels: ProductRegel[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Een cent-verschil (floating point-ruis) telt niet als een echte
// bandbreedte — dan tonen we één bedrag in plaats van een schijnbare range.
function magBedrag(min: number, max: number): Bedrag {
  return Math.abs(min - max) < 0.005 ? min : { min, max };
}

// Eén representatief getal uit een Bedrag — voor plekken die per definitie
// één enkel getal nodig hebben (bijv. Lead.totaalIndicatie, een simpel
// KPI-getal in de leads-CRM). Neemt bewust de bovengrens: liever een te hoge
// dan een te lage pipeline-inschatting voor de vakman.
export function bedragTop(bedrag: Bedrag): number {
  return typeof bedrag === "number" ? bedrag : bedrag.max;
}

type Richting = "MIN" | "MAX" | "MIDDEN";

function materiaalOptiePrijsVoor(option: CalcMaterialOption, richting: Richting): number {
  if (option.prijsType !== "BANDBREEDTE" || option.prijsMin == null || option.prijsMax == null) {
    return option.prijs;
  }
  if (richting === "MIN") return option.prijsMin;
  if (richting === "MAX") return option.prijsMax;
  return (option.prijsMin + option.prijsMax) / 2;
}

function transformeerProductVoorRichting(product: CalcProduct, richting: Richting): CalcProduct {
  return {
    ...product,
    materiaalCategorieen: product.materiaalCategorieen.map((categorie) => ({
      ...categorie,
      materialen: categorie.materialen.map((materiaal) => ({
        ...materiaal,
        prijs: materiaalOptiePrijsVoor(materiaal, richting),
      })),
    })),
  };
}

// Bovenop calculateBreakdown() (die voor modus "geen" volledig ongewijzigd
// blijft — zie hierboven): rekent de prijsbandbreedte door volgens de
// gekozen modus. Bandbreedte-prijzen worden vóór het doorrekenen vertaald
// naar het bestaande vaste-prijsveld (prijs), zodat calculateBreakdown()
// zelf nooit hoeft te weten dat bandbreedtes bestaan.
export function calculateBreakdownRange(args: {
  products: CalcProduct[];
  productQty: Record<string, number>;
  productRegelsBedrag?: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  costSettings: CalcCostSettings;
}): BreakdownRange {
  const { costSettings } = args;
  const modus = costSettings.bandbreedteModus;

  // Ongeacht modus: het MIDDEN-scenario levert altijd de per-product
  // regelprijzen (productRegels) — die tonen zelf nooit een bandbreedte,
  // ook niet in modus PER_PRODUCT (zie BreakdownRange.productRegels).
  const middenArgs = {
    ...args,
    products: args.products.map((p) => transformeerProductVoorRichting(p, "MIDDEN")),
  };
  const bMidden = calculateBreakdown(middenArgs);

  if (modus === "PER_PRODUCT") {
    const minArgs = {
      ...args,
      products: args.products.map((p) => transformeerProductVoorRichting(p, "MIN")),
    };
    const maxArgs = {
      ...args,
      products: args.products.map((p) => transformeerProductVoorRichting(p, "MAX")),
    };
    const bMin = calculateBreakdown(minArgs);
    const bMax = calculateBreakdown(maxArgs);

    return {
      modus,
      arbeidskosten: magBedrag(bMin.arbeidskosten, bMax.arbeidskosten),
      materiaalkosten: magBedrag(bMin.materiaalkosten, bMax.materiaalkosten),
      transportkosten: magBedrag(bMin.transportkosten, bMax.transportkosten),
      voorrijkosten: magBedrag(bMin.voorrijkosten, bMax.voorrijkosten),
      subtotaal: magBedrag(bMin.subtotaal, bMax.subtotaal),
      btw: magBedrag(bMin.btw, bMax.btw),
      totaal: magBedrag(bMin.totaal, bMax.totaal),
      heeftSelectie: bMin.heeftSelectie,
      productRegels: bMidden.productRegels,
    };
  }

  if (modus === "TOTAAL" && bMidden.heeftSelectie) {
    const totaalMin = round2(bMidden.totaal * (1 - costSettings.bandbreedteMargeOmlaag / 100));
    const totaalMax = round2(bMidden.totaal * (1 + costSettings.bandbreedteMargeOmhoog / 100));
    return {
      modus,
      arbeidskosten: bMidden.arbeidskosten,
      materiaalkosten: bMidden.materiaalkosten,
      transportkosten: bMidden.transportkosten,
      voorrijkosten: bMidden.voorrijkosten,
      subtotaal: bMidden.subtotaal,
      btw: bMidden.btw,
      totaal: magBedrag(totaalMin, totaalMax),
      heeftSelectie: bMidden.heeftSelectie,
      margeOmlaag: costSettings.bandbreedteMargeOmlaag,
      margeOmhoog: costSettings.bandbreedteMargeOmhoog,
      productRegels: bMidden.productRegels,
    };
  }

  return { modus, ...bMidden };
}
