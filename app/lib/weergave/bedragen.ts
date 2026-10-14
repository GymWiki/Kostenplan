import type { PricingResult } from "@/app/lib/pricing/engine";

// Bedragen per onderdeel voor tegels, onderbalk en overzicht: de regels van de rekenkern, incl. btw. Alle onderdelen
// samen plus de kosten die niet bij één onderdeel horen (voorrijkosten per aanvraag, afstandstoeslag, aanvulling tot
// het minimumtarief) zijn precies het totaal, want de kern telt het totaal op uit diezelfde regels.

export const onderdeelInclCenten = (r: PricingResult, onderdeelId: string): number =>
  r.regels.filter((x) => x.onderdeelId === onderdeelId).reduce((s, x) => s + x.bedragInclCenten, 0);

export const overigeKostenInclCenten = (r: PricingResult): number => r.regels.filter((x) => x.onderdeelId === null).reduce((s, x) => s + x.bedragInclCenten, 0);

// Heeft dit onderdeel een hoeveelheid en geen waarschuwing die doorgaan verhindert (ontbrekende keuze of prijs)?
export function onderdeelIsGeldig(r: PricingResult, onderdeelId: string): boolean {
  const o = r.onderdelen.find((x) => x.id === onderdeelId);
  if (!o || !(o.hoeveelheid > 0)) return false;
  return !r.waarschuwingen.some((w) => w.onderdeelId === onderdeelId && (w.code === "ontbrekende-keuze" || w.code === "ongeldige-invoer" || w.code === "hoeveelheid-te-groot"));
}
