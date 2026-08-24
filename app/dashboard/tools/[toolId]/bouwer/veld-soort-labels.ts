import type { CalculatorField } from "@/app/lib/calculator-engine";

// Gedeeld tussen VeldFormModal (v1, velden-tab.tsx) en VeldSettingsForm (v2,
// inline drie-koloms bouwer) — puur labels/uitleg, geen gedrag.
export const SOORT_LABELS: Record<CalculatorField["soort"], string> = {
  NUMMER: "Getal",
  AANTAL: "Aantal",
  OPPERVLAKTE: "Oppervlakte (handmatig)",
  SLIDER: "Schuifbalk",
  TEKST: "Tekst",
  JA_NEE: "Ja / nee",
  CHECKBOX: "Aanvinkvakje",
  DROPDOWN: "Keuzelijst",
  RADIO: "Keuzerondjes",
  MEERKEUZE: "Meerdere keuzes",
  AFMETINGEN: "Afmetingen (lengte × breedte)",
  PRODUCT_KEUZE: "Materiaal-/productkeuze",
};

export const SOORT_UITLEG: Record<CalculatorField["soort"], string> = {
  NUMMER: "De klant vult een getal in, bijv. het aantal meters.",
  AANTAL: "Hetzelfde als een getal, maar met 'aantal' als standaardlabel.",
  OPPERVLAKTE: "De klant vult direct een oppervlakte in (m²).",
  SLIDER: "De klant sleept een schuifbalk naar de gewenste waarde.",
  TEKST: "Vrije tekst, bijv. een opmerking of adres.",
  JA_NEE: "Een aan/uit-schakelaar, bijv. 'oude schutting verwijderen?'.",
  CHECKBOX: "Een vinkje, bijv. voor een optionele extra.",
  DROPDOWN: "De klant kiest één optie uit een lijst.",
  RADIO: "De klant kiest één optie uit zichtbare rondjes.",
  MEERKEUZE: "De klant kan meerdere opties tegelijk aanvinken.",
  AFMETINGEN: "Lengte × breedte (en optioneel hoogte) — oppervlakte wordt automatisch berekend.",
  PRODUCT_KEUZE: "De klant kiest een materiaal of product, elk met een eigen prijs.",
};

// Compacte meta-regel per vraag ("Getal · m² · Verplicht") — gebruikt in de
// rijweergave (v1-lijst en v2-boom).
export function veldMeta(veld: CalculatorField): string {
  const delen = [SOORT_LABELS[veld.soort]];
  if ("eenheid" in veld && veld.eenheid) delen.push(veld.eenheid);
  if ("opties" in veld) delen.push(`${veld.opties.length} ${veld.opties.length === 1 ? "optie" : "opties"}`);
  if (veld.verplicht) delen.push("Verplicht");
  return delen.join(" · ");
}
