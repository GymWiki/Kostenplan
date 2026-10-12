import { bedragTop, geselecteerdeMateriaalOptieId, type BreakdownRange, type CalcProduct, type ProductRegel } from "@/app/lib/calculate";
import type { LeadSnapshot, LeadSnapshotLine, LeadSnapshotOpbouw } from "@/app/lib/leads";

export type SnapshotProduct = Omit<CalcProduct, "extraOpties" | "materiaalCategorieen"> & {
  naam: string;
  eenheid: string;
  extraOpties: (CalcProduct["extraOpties"][number] & { naam: string })[];
  materiaalCategorieen: (CalcProduct["materiaalCategorieen"][number] & { naam: string })[];
};

// Zet de uitsplitsing uit calculateBreakdown om naar de vorm in de lead-snapshot
// (extra's krijgen hun naam mee); zie LeadSnapshotOpbouw in app/lib/leads.ts.
export function opbouwVoorSnapshot(opbouw: ProductRegel["opbouw"], extraOpties: { id: string; naam: string }[], heeftArtikelen: boolean): LeadSnapshotOpbouw {
  return {
    materiaal: opbouw.materiaal.map((m) => ({ naam: m.optieNaam, hoeveelheid: m.hoeveelheid, prijsPerEenheid: m.prijsPerEenheid, bedrag: m.bedrag })),
    artikelen: heeftArtikelen && opbouw.artikelen > 0 ? { bedrag: opbouw.artikelen } : undefined,
    arbeid: opbouw.arbeid
      ? { tijd: opbouw.arbeid.tijd, eenheid: opbouw.arbeid.eenheid === "UUR" ? "uur" : opbouw.arbeid.eenheid === "DAG" ? "dag" : "dagdeel", tarief: opbouw.arbeid.tarief, bedrag: opbouw.arbeid.bedrag }
      : undefined,
    transport: opbouw.transport.bedrag > 0 ? opbouw.transport : undefined,
    voorrijkosten: opbouw.voorrijkosten.bedrag > 0 ? opbouw.voorrijkosten : undefined,
    extras: opbouw.extras.map((e) => ({ naam: extraOpties.find((x) => x.id === e.id)?.naam ?? "Extra", aantal: e.aantal, bedrag: e.bedrag })),
  };
}

// Bevroren "wat had de klant aangevinkt" voor de leads-CRM — meegestuurd bij
// "Offerte aanvragen" zodat de hovenier later precies kan zien waarop de
// prijsindicatie was gebaseerd, ook als de onderdelen intussen gewijzigd zijn.
export function bouwLeadSnapshot({
  products,
  productQty,
  productRegelsBedrag,
  materialSelections,
  extraSelections,
  breakdown,
  btwPercentage,
}: {
  products: SnapshotProduct[];
  productQty: Record<string, number>;
  productRegelsBedrag: Record<string, number>;
  materialSelections: Record<string, string>;
  extraSelections: Record<string, number>;
  breakdown: BreakdownRange;
  btwPercentage: number;
}): LeadSnapshot {
  const regels: LeadSnapshotLine[] = [];
  for (const product of products) {
    const qty = productQty[product.id] ?? 0;
    if (qty <= 0 && (productRegelsBedrag[product.id] ?? 0) <= 0) continue;

    const materiaalNamen = product.materiaalCategorieen
      .map((category) => {
        const selectedId = geselecteerdeMateriaalOptieId(category, materialSelections);
        return category.materialen.find((m) => m.id === selectedId);
      })
      .filter((option): option is NonNullable<typeof option> => Boolean(option))
      .map((option) => option.naam);
    const extraNamen = product.extraOpties.filter((extra) => extra.altijd || (extraSelections[extra.id] ?? 0) > 0).map((extra) => extra.naam);

    // Eigen, volledig berekend bedrag van dit product (materiaal + arbeid +
    // transport + voorrijkosten) en de uitsplitsing daarvan.
    const productRegel = breakdown.productRegels.find((regel) => regel.productId === product.id);
    regels.push({
      productId: product.id,
      naam: product.naam,
      type: "product",
      aantal: qty,
      eenheid: product.eenheid,
      materiaal: materiaalNamen.length > 0 ? materiaalNamen.join(", ") : undefined,
      extras: extraNamen.length > 0 ? extraNamen : undefined,
      prijs: productRegel?.totaal,
      opbouw: productRegel ? opbouwVoorSnapshot(productRegel.opbouw, product.extraOpties, (productRegelsBedrag[product.id] ?? 0) > 0) : undefined,
    });
  }
  return {
    regels,
    arbeidskosten: bedragTop(breakdown.arbeidskosten),
    materiaalkosten: bedragTop(breakdown.materiaalkosten),
    transportkosten: bedragTop(breakdown.transportkosten),
    voorrijkosten: bedragTop(breakdown.voorrijkosten),
    subtotaal: bedragTop(breakdown.subtotaal),
    btw: bedragTop(breakdown.btw),
    totaal: bedragTop(breakdown.totaal),
    btwPercentage,
    bandbreedte: breakdown.modus !== "GEEN" && typeof breakdown.totaal !== "number" ? true : undefined,
  };
}
