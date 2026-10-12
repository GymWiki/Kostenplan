import type { CalcCostSettings } from "@/app/lib/calculate";
import { configVanProducten, invoerVanKlant, arbeidTariefVoorEenheid } from "@/app/lib/pricing/adapters";
import { berekenPrijs } from "@/app/lib/pricing/engine";
import type { PreviewProduct } from "@/app/lib/werkzaamheid";

// De kostenopbouw "alleen voor jou" voor één werkzaamheid en één gekozen materiaal — uitsluitend uit
// de rekenkern (app/lib/pricing), dezelfde berekening als de klant-rekentool, de aanvraag en de
// offerte. Gedeeld door het bewerkscherm, de wizard en het overzicht. Bedragen in euro's.
export type MateriaalRegelWeergave = { categorie: string; omschrijving: string; aantal: number; prijsPerEenheid: number; bedrag: number };

export type KostenOpbouw = {
  hoeveelheid: number;
  // Materiaal inclusief extra's en toeslagen.
  materiaal: number;
  // Per materiaalcategorie een eigen regel (aantal × prijs per eenheid).
  materiaalRegels: MateriaalRegelWeergave[];
  // Extra's en toeslagen (altijd meegerekend), apart van het materiaal.
  extraRegels: { omschrijving: string; aantal: number; bedrag: number }[];
  arbeid: number;
  // Aantal arbeidseenheden (dagdelen/dagen/uren) dat de arbeid kost.
  arbeidstijd: number;
  arbeidTarief: number;
  transport: number;
  // Alleen bij "transport per dag": aantal begonnen dagen.
  transportDagen: number | null;
  voorrijkosten: number;
  // Excl. btw — hovenierstarieven zijn al inclusief marge, btw komt er in de
  // klant-rekentool apart bij.
  totaal: number;
  // Wat er aan de invoer niet klopt (ontbrekende prijs, geen werktempo, …).
  waarschuwingen: string[];
};

export function berekenKostenOpbouw({
  product,
  optieId,
  hoeveelheid,
  costSettings,
}: {
  product: PreviewProduct;
  optieId: string | null;
  hoeveelheid: number;
  costSettings: CalcCostSettings;
}): KostenOpbouw {
  const categorie = product.materiaalCategorieen[0];
  const gekozen = categorie?.materialen.find((m) => m.id === optieId) ?? categorie?.materialen[0];
  const keuzes: Record<string, string> = {};
  for (const [i, c] of product.materiaalCategorieen.entries()) {
    const keuze = i === 0 ? gekozen : c.materialen[0];
    if (keuze) keuzes[c.id] = keuze.id;
  }

  // Het voorbeeld rekent altijd met een losse hoeveelheid, ook bij sjablonen met lengte × breedte.
  const bron = { ...product, sjabloon: "ENKELE_HOEVEELHEID" as const };
  const r = berekenPrijs(
    configVanProducten([bron], costSettings),
    invoerVanKlant({ producten: [bron], hoeveelheden: { [product.id]: hoeveelheid }, materiaalKeuzes: keuzes })
  );
  const o = r.onderdelen[0];
  const euro = (c: number) => c / 100;
  const k = o?.kosten;
  return {
    hoeveelheid,
    materiaal: euro((k?.materiaal ?? 0) + (k?.extra ?? 0) + (k?.artikel ?? 0)),
    materiaalRegels: (o?.regels ?? []).filter((x) => x.soort === "materiaal").map((x) => ({ categorie: x.categorie ?? "Materiaal", omschrijving: x.omschrijving, aantal: x.aantal, prijsPerEenheid: euro(x.prijsPerEenheidCenten), bedrag: euro(x.bedragExclCenten) })),
    extraRegels: (o?.regels ?? []).filter((x) => x.soort === "extra" || x.soort === "artikel").map((x) => ({ omschrijving: x.omschrijving, aantal: x.aantal, bedrag: euro(x.bedragExclCenten) })),
    arbeid: euro(k?.arbeid ?? 0),
    arbeidstijd: o?.arbeidstijd ?? 0,
    arbeidTarief: product.arbeidTariefOverride ?? arbeidTariefVoorEenheid(costSettings, costSettings.arbeidStapEenheid),
    transport: euro(k?.transport ?? 0),
    transportDagen: o?.transportDagen ?? null,
    voorrijkosten: euro(k?.voorrijkosten ?? 0),
    totaal: euro(o?.subtotaalExclCenten ?? 0),
    waarschuwingen: r.waarschuwingen.map((w) => w.bericht),
  };
}

// Prijsrange per eenheid over alle materialen (voor de overzichtskaart).
export function prijsRange(product: PreviewProduct): { min: number; max: number } | null {
  const prijzen = (product.materiaalCategorieen[0]?.materialen ?? []).flatMap((m) =>
    m.prijsType === "BANDBREEDTE" && m.prijsMin != null && m.prijsMax != null ? [m.prijsMin, m.prijsMax] : [m.prijs]
  );
  if (prijzen.length === 0) return null;
  return { min: Math.min(...prijzen), max: Math.max(...prijzen) };
}
