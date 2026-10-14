import type { CalcCostSettings } from "@/app/lib/calculate";
import { configVanProducten, invoerVanKlant, type BronProduct } from "@/app/lib/pricing/adapters";
import { berekenPrijs } from "@/app/lib/pricing/engine";

// "Vanaf"-prijs van één onderdeel, uit dezelfde rekenkern als de rest: goedkoopste materiaal per keuze, een vaste
// voorbeeldmaat, zonder werkgebied en minimum. Daardoor is hij nooit hoger dan een echte berekening met dezelfde maat.
// Alleen "Eén hoeveelheid" en "Lengte × breedte" hebben één maat; ruimtes en artikelregels geven geen vanaf-prijs (null).

export const standaardVoorbeeldmaat = (eenheid: string) => (eenheid === "stuks" ? 1 : 10);

export function heeftVanafPrijs(product: Pick<BronProduct, "sjabloon">): boolean {
  return product.sjabloon === undefined || product.sjabloon === "ENKELE_HOEVEELHEID" || product.sjabloon === "AFMETINGEN";
}

// De invoer voor één onderdeel met een gegeven maat (in de eenheid van het onderdeel): hoeveelheid, of 1 m breed.
export function maatInvoer(product: Pick<BronProduct, "sjabloon">, maat: number): { hoeveelheid?: number; sjabloonInvoer?: Record<string, unknown> } {
  if (product.sjabloon === "AFMETINGEN") return { sjabloonInvoer: { lengte: maat, breedte: 1, diepte: 1 } };
  return { hoeveelheid: maat };
}

function goedkoopsteMaterialen(product: BronProduct): Record<string, string> {
  const keuzes: Record<string, string> = {};
  for (const c of product.materiaalCategorieen) {
    let beste: { id: string; prijs: number } | null = null;
    for (const m of c.materialen) {
      const prijs = m.prijsType === "BANDBREEDTE" && m.prijsMin != null ? m.prijsMin : m.prijs;
      if (!beste || prijs < beste.prijs) beste = { id: m.id, prijs };
    }
    if (beste) keuzes[c.id] = beste.id;
  }
  return keuzes;
}

export type VanafOpties = { maat?: number | null; inclVoorrij?: boolean; kor?: boolean };

// Vanaf-prijs in centen incl. btw, of null als er niets te rekenen valt.
export function vanafPrijsCenten(product: BronProduct, kosten: CalcCostSettings, opties: VanafOpties = {}): number | null {
  if (!heeftVanafPrijs(product)) return null;
  const maat = opties.maat && opties.maat > 0 ? opties.maat : standaardVoorbeeldmaat(product.eenheid ?? "stuks");
  const config = configVanProducten([product], kosten, { kor: opties.kor ?? false });
  if (!opties.inclVoorrij) config.tarieven.voorrijEnabled = false;
  const m = maatInvoer(product, maat);
  const invoer = invoerVanKlant({
    producten: [product],
    hoeveelheden: m.hoeveelheid !== undefined ? { [product.id]: m.hoeveelheid } : undefined,
    sjabloonInvoer: m.sjabloonInvoer ? { [product.id]: m.sjabloonInvoer } : undefined,
    materiaalKeuzes: goedkoopsteMaterialen(product),
  });
  const r = berekenPrijs(config, invoer);
  if (!r.heeftSelectie) return null;
  // Bij een bandbreedte is de laagste prijs het vertrekpunt.
  const laagste = r.bandbreedte ? Math.min(r.totaalInclCenten, r.bandbreedte.min.totaalInclCenten) : r.totaalInclCenten;
  return laagste > 0 ? laagste : null;
}
