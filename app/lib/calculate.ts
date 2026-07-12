export type CalcCostSettings = {
  arbeidEnabled: boolean;
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
  arbeidsuren: number;
  materiaalkosten: number;
};

export type CalcProduct = {
  id: string;
  prijs: number;
};

export function calculateBreakdown({
  services,
  products,
  serviceQty,
  productQty,
  afstandKm,
  costSettings,
}: {
  services: CalcService[];
  products: CalcProduct[];
  serviceQty: Record<string, number>;
  productQty: Record<string, number>;
  afstandKm: number;
  costSettings: CalcCostSettings;
}) {
  let arbeidskosten = 0;
  let materiaalkosten = 0;
  let itemCount = 0;

  for (const service of services) {
    const qty = serviceQty[service.id] ?? 0;
    if (qty <= 0) continue;
    itemCount += 1;
    if (costSettings.arbeidEnabled) {
      arbeidskosten += qty * service.arbeidsuren * costSettings.arbeidTarief;
    }
    if (costSettings.materiaalEnabled) {
      materiaalkosten += qty * service.materiaalkosten;
    }
  }

  for (const product of products) {
    const qty = productQty[product.id] ?? 0;
    if (qty <= 0) continue;
    itemCount += 1;
    if (costSettings.materiaalEnabled) {
      materiaalkosten += qty * product.prijs;
    }
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
