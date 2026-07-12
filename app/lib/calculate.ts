export type ArbeidStapEenheid = "UUR" | "DAGDEEL" | "DAG";

export type CalcCostSettings = {
  arbeidEnabled: boolean;
  arbeidStapEenheid: ArbeidStapEenheid;
  arbeidTarief: number;
  transportEnabled: boolean;
  transportType: "VAST" | "PER_KM";
  transportTarief: number;
  voorrijEnabled: boolean;
  voorrijTarief: number;
  materiaalEnabled: boolean;
  materiaalMarge: number;
  btwPercentage: number;
};

export type CalcService = {
  id: string;
  arbeidstijd: number;
  materiaalkosten: number;
};

export type CalcMaterialOption = {
  id: string;
  prijs: number;
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
  serviceQty,
  productQty,
  materialSelections,
  extraSelections,
  afstandKm,
  costSettings,
}: {
  services: CalcService[];
  products: CalcProduct[];
  serviceQty: Record<string, number>;
  productQty: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  afstandKm: number;
  costSettings: CalcCostSettings;
}) {
  let arbeidstijd = 0;
  let materiaalkosten = 0;
  let itemCount = 0;

  for (const service of services) {
    const qty = serviceQty[service.id] ?? 0;
    if (qty <= 0) continue;
    itemCount += 1;
    arbeidstijd += qty * service.arbeidstijd;
    if (costSettings.materiaalEnabled) {
      materiaalkosten += qty * service.materiaalkosten;
    }
  }

  for (const product of products) {
    const qty = productQty[product.id] ?? 0;
    if (qty <= 0) continue;
    itemCount += 1;

    if (product.arbeidsCapaciteit && product.arbeidsCapaciteit > 0) {
      arbeidstijd += qty / product.arbeidsCapaciteit;
    }

    if (costSettings.materiaalEnabled) {
      for (const category of product.materiaalCategorieen) {
        const selectedId = materialSelections[category.id];
        if (!selectedId) continue;
        const option = category.materialen.find((m) => m.id === selectedId);
        if (!option) continue;
        const effectiveQty =
          option.stapgrootte && option.stapgrootte > 0
            ? roundUpToStep(qty, option.stapgrootte)
            : qty;
        materiaalkosten += effectiveQty * option.prijs;
      }

      for (const extra of product.extraOpties) {
        const aantal = extraSelections[extra.id] ?? 0;
        if (aantal <= 0) continue;
        materiaalkosten += (extra.type === "PER_STUK" ? aantal : qty) * extra.prijs;
      }
    }
  }

  let arbeidskosten = 0;
  if (costSettings.arbeidEnabled) {
    const billedArbeidstijd =
      costSettings.arbeidStapEenheid === "UUR" ? arbeidstijd : ceilStep(arbeidstijd);
    arbeidskosten = billedArbeidstijd * costSettings.arbeidTarief;
  }

  if (costSettings.materiaalEnabled && costSettings.materiaalMarge > 0) {
    materiaalkosten *= 1 + costSettings.materiaalMarge / 100;
  }

  const heeftSelectie = itemCount > 0;

  let transportkosten = 0;
  if (costSettings.transportEnabled && heeftSelectie) {
    transportkosten =
      costSettings.transportType === "VAST"
        ? costSettings.transportTarief
        : Math.max(0, afstandKm) * costSettings.transportTarief;
  }

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
