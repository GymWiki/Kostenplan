export type ArbeidStapEenheid = "UUR" | "DAGDEEL" | "DAG";

export type CalcCostSettings = {
  arbeidEnabled: boolean;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTarief: number;
  arbeidTariefPerProduct: boolean;
  transportEnabled: boolean;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  materiaalEnabled: boolean;
  materiaalMarge: number;
  materiaalMargePerProduct: boolean;
  btwPercentage: number;
  bandbreedteModus: BandbreedteModus;
  bandbreedteMargeOmlaag: number;
  bandbreedteMargeOmhoog: number;
};

export type PrijsType = "VAST" | "BANDBREEDTE";
export type BandbreedteModus = "GEEN" | "PER_PRODUCT" | "TOTAAL";

// Een Dienst draait om arbeid: óf een uurtarief × geschatte uren, óf één
// vaste projectprijs. De klant vinkt hem simpelweg aan/uit — geen
// hoeveelheid, geen materiaalkosten, los van CostSettings.arbeidTarief.
export type CalcService = {
  id: string;
  prijsType: "UURTARIEF" | "VASTE_PRIJS";
  uurtarief: number;
  geschatteUren: number;
  vastePrijs: number;
  // Bandbreedte (zie PrijsType): bij BANDBREEDTE wordt, afhankelijk van
  // prijsType hierboven, geschatteUrenMin/Max of vastePrijsMin/Max gebruikt
  // in plaats van het vaste geschatteUren/vastePrijs-veld.
  bandbreedteType: PrijsType;
  geschatteUrenMin: number | null;
  geschatteUrenMax: number | null;
  vastePrijsMin: number | null;
  vastePrijsMax: number | null;
};

export type CalcMaterialOption = {
  id: string;
  prijs: number;
  prijsType: PrijsType;
  prijsMin: number | null;
  prijsMax: number | null;
  stapgrootte: number | null;
};

export type CalcMaterialCategory = {
  id: string;
  materialen: CalcMaterialOption[];
};

export type CalcExtraOption = {
  id: string;
  prijs: number;
  type: "PER_EENHEID" | "PER_STUK";
};

export type CalcProduct = {
  id: string;
  arbeidsCapaciteit: number | null;
  arbeidTariefOverride: number | null;
  materiaalMargeOverride: number | null;
  // Vast bedrag, telt één keer mee zodra dit product gekozen is (niet
  // vermenigvuldigd met de hoeveelheid).
  transportkosten: number;
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

export function calculateBreakdown({
  services,
  products,
  serviceSelected,
  productQty,
  materialSelections,
  extraSelections,
  costSettings,
}: {
  services: CalcService[];
  products: CalcProduct[];
  serviceSelected: Record<string, boolean>;
  productQty: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  costSettings: CalcCostSettings;
}) {
  // Arbeidstijd van Producten wordt bijgehouden per geldend tarief (het
  // globale tarief, of een product-override), zodat items met hetzelfde
  // tarief nog steeds sámen naar boven afgerond worden op hele stappen
  // (dagdeel/dag), terwijl een product met een eigen tarief op zichzelf
  // wordt afgerond. Diensten hebben hun eigen uurtarief en tellen los
  // daarvan direct mee in arbeidskosten (geen gedeelde stap-afronding).
  const arbeidstijdPerTarief = new Map<number, number>();
  let arbeidskosten = 0;
  let materiaalkosten = 0;
  let transportkosten = 0;
  let itemCount = 0;

  function addArbeidstijd(tarief: number, tijd: number) {
    if (tijd <= 0) return;
    arbeidstijdPerTarief.set(tarief, (arbeidstijdPerTarief.get(tarief) ?? 0) + tijd);
  }

  for (const service of services) {
    if (!serviceSelected[service.id]) continue;
    itemCount += 1;
    if (costSettings.arbeidEnabled) {
      arbeidskosten +=
        service.prijsType === "VASTE_PRIJS"
          ? service.vastePrijs
          : service.uurtarief * service.geschatteUren;
    }
  }

  for (const product of products) {
    const qty = productQty[product.id] ?? 0;
    if (qty <= 0) continue;
    itemCount += 1;

    if (product.arbeidsCapaciteit && product.arbeidsCapaciteit > 0) {
      const arbeidTarief =
        costSettings.arbeidTariefPerProduct && product.arbeidTariefOverride != null
          ? product.arbeidTariefOverride
          : costSettings.arbeidTarief;
      addArbeidstijd(arbeidTarief, qty / product.arbeidsCapaciteit);
    }

    if (costSettings.materiaalEnabled) {
      let productMateriaalkosten = 0;
      for (const category of product.materiaalCategorieen) {
        const selectedId = materialSelections[category.id];
        if (!selectedId) continue;
        const option = category.materialen.find((m) => m.id === selectedId);
        if (!option) continue;
        const effectiveQty =
          option.stapgrootte && option.stapgrootte > 0
            ? roundUpToStep(qty, option.stapgrootte)
            : qty;
        productMateriaalkosten += effectiveQty * option.prijs;
      }

      for (const extra of product.extraOpties) {
        const aantal = extraSelections[extra.id] ?? 0;
        if (aantal <= 0) continue;
        productMateriaalkosten += (extra.type === "PER_STUK" ? aantal : qty) * extra.prijs;
      }

      const materiaalMarge =
        costSettings.materiaalMargePerProduct && product.materiaalMargeOverride != null
          ? product.materiaalMargeOverride
          : costSettings.materiaalMarge;
      materiaalkosten += productMateriaalkosten * (1 + materiaalMarge / 100);
    }

    if (costSettings.transportEnabled) {
      transportkosten += product.transportkosten;
    }
  }

  if (costSettings.arbeidEnabled) {
    for (const [tarief, tijd] of arbeidstijdPerTarief) {
      const billedTijd = costSettings.arbeidStapEenheid === "UUR" ? tijd : ceilStep(tijd);
      arbeidskosten += billedTijd * tarief;
    }
  }

  const heeftSelectie = itemCount > 0;

  let voorrijkosten = 0;
  if (costSettings.voorrijEnabled && heeftSelectie) {
    voorrijkosten = costSettings.voorrijTarief;
  }

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

// Vaste/gemiddelde prijs van een dienst, ongeacht of hij een bandbreedte
// heeft — voor plekken die één enkel getal nodig hebben (bijv. de
// lead-snapshot). Zelfde herleiding als calculateBreakdownRange() gebruikt
// voor modus "geen"/"totaal".
export function serviceVastePrijs(service: CalcService): number {
  const middenService = transformeerServiceVoorRichting(service, "MIDDEN");
  return middenService.prijsType === "VASTE_PRIJS"
    ? middenService.vastePrijs
    : middenService.uurtarief * middenService.geschatteUren;
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

function transformeerServiceVoorRichting(service: CalcService, richting: Richting): CalcService {
  if (service.bandbreedteType !== "BANDBREEDTE") return service;

  if (service.prijsType === "VASTE_PRIJS") {
    if (service.vastePrijsMin == null || service.vastePrijsMax == null) return service;
    const vastePrijs =
      richting === "MIN"
        ? service.vastePrijsMin
        : richting === "MAX"
          ? service.vastePrijsMax
          : (service.vastePrijsMin + service.vastePrijsMax) / 2;
    return { ...service, vastePrijs };
  }

  if (service.geschatteUrenMin == null || service.geschatteUrenMax == null) return service;
  const geschatteUren =
    richting === "MIN"
      ? service.geschatteUrenMin
      : richting === "MAX"
        ? service.geschatteUrenMax
        : (service.geschatteUrenMin + service.geschatteUrenMax) / 2;
  return { ...service, geschatteUren };
}

// Bovenop calculateBreakdown() (die voor modus "geen" volledig ongewijzigd
// blijft — zie hierboven): rekent de prijsbandbreedte door volgens de
// gekozen modus. Bandbreedte-prijzen worden vóór het doorrekenen vertaald
// naar het bestaande vaste-prijsveld (prijs/vastePrijs/geschatteUren), zodat
// calculateBreakdown() zelf nooit hoeft te weten dat bandbreedtes bestaan.
export function calculateBreakdownRange(args: {
  services: CalcService[];
  products: CalcProduct[];
  serviceSelected: Record<string, boolean>;
  productQty: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  costSettings: CalcCostSettings;
}): BreakdownRange {
  const { costSettings } = args;
  const modus = costSettings.bandbreedteModus;

  if (modus === "PER_PRODUCT") {
    const minArgs = {
      ...args,
      services: args.services.map((s) => transformeerServiceVoorRichting(s, "MIN")),
      products: args.products.map((p) => transformeerProductVoorRichting(p, "MIN")),
    };
    const maxArgs = {
      ...args,
      services: args.services.map((s) => transformeerServiceVoorRichting(s, "MAX")),
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
    };
  }

  // GEEN en TOTAAL rekenen allebei één keer door met "vaste" bedragen —
  // bandbreedte-items worden herleid tot hun gemiddelde van min/max.
  const middenArgs = {
    ...args,
    services: args.services.map((s) => transformeerServiceVoorRichting(s, "MIDDEN")),
    products: args.products.map((p) => transformeerProductVoorRichting(p, "MIDDEN")),
  };
  const b = calculateBreakdown(middenArgs);

  if (modus === "TOTAAL" && b.heeftSelectie) {
    const totaalMin = round2(b.totaal * (1 - costSettings.bandbreedteMargeOmlaag / 100));
    const totaalMax = round2(b.totaal * (1 + costSettings.bandbreedteMargeOmhoog / 100));
    return {
      modus,
      arbeidskosten: b.arbeidskosten,
      materiaalkosten: b.materiaalkosten,
      transportkosten: b.transportkosten,
      voorrijkosten: b.voorrijkosten,
      subtotaal: b.subtotaal,
      btw: b.btw,
      totaal: magBedrag(totaalMin, totaalMax),
      heeftSelectie: b.heeftSelectie,
      margeOmlaag: costSettings.bandbreedteMargeOmlaag,
      margeOmhoog: costSettings.bandbreedteMargeOmhoog,
    };
  }

  return { modus, ...b };
}
