import {
  afmetingenSubvariabelen,
  productKeuzePrijsVariabele,
  type CalculatorField,
  type DerivedVariable,
  type VariableType,
} from "@/app/lib/calculator-engine";

export type BeschikbareVariabele = {
  naam: string;
  label: string;
  type: VariableType;
  // Voor OPTION-variabelen (DROPDOWN/RADIO/PRODUCT_KEUZE): de keuzemogelijkheden,
  // zodat een conditie-builder ("is gelijk aan...") een dropdown kan tonen
  // i.p.v. een vrij tekstveld.
  opties?: { waarde: string; label: string }[];
};

// Alle variabelen die een builder-gebruiker kan kiezen in een prijsregel of
// conditie — velden (inclusief hun afgeleiden, zoals AFMETINGEN ->
// lengte/breedte/oppervlakte) plus expliciete afgeleide variabelen. Zelfde
// bron van waarheid als variabelenVoorVeld() in calculator-engine/validate.ts,
// hier apart gehouden omdat dit puur UI-labels toevoegt (geen validatielogica).
export function beschikbareVariabelen(velden: CalculatorField[], afgeleideVariabelen: DerivedVariable[]): BeschikbareVariabele[] {
  const resultaat: BeschikbareVariabele[] = [];

  for (const veld of velden) {
    switch (veld.soort) {
      case "NUMMER":
      case "AANTAL":
      case "OPPERVLAKTE":
      case "SLIDER":
        resultaat.push({ naam: veld.id, label: veld.label, type: "NUMBER" });
        break;
      case "JA_NEE":
      case "CHECKBOX":
        resultaat.push({ naam: veld.id, label: veld.label, type: "BOOLEAN" });
        break;
      case "TEKST":
        resultaat.push({ naam: veld.id, label: veld.label, type: "TEXT" });
        break;
      case "DROPDOWN":
      case "RADIO":
        resultaat.push({ naam: veld.id, label: veld.label, type: "OPTION", opties: veld.opties });
        break;
      case "PRODUCT_KEUZE":
        resultaat.push({
          naam: productKeuzePrijsVariabele(veld.id),
          label: `${veld.label} — prijs`,
          type: "NUMBER",
        });
        break;
      case "AFMETINGEN": {
        const namen = afmetingenSubvariabelen(veld.id, veld.metHoogte);
        resultaat.push({ naam: namen.lengte, label: `${veld.label} — lengte`, type: "NUMBER" });
        resultaat.push({ naam: namen.breedte, label: `${veld.label} — breedte`, type: "NUMBER" });
        if (namen.hoogte) resultaat.push({ naam: namen.hoogte, label: `${veld.label} — hoogte`, type: "NUMBER" });
        resultaat.push({ naam: namen.oppervlakte, label: `${veld.label} — oppervlakte`, type: "NUMBER" });
        if (namen.volume) resultaat.push({ naam: namen.volume, label: `${veld.label} — volume`, type: "NUMBER" });
        break;
      }
    }
  }

  for (const variabele of afgeleideVariabelen) {
    resultaat.push({ naam: variabele.id, label: variabele.label, type: variabele.type });
  }

  return resultaat;
}

export function numeriekeVariabelen(variabelen: BeschikbareVariabele[]) {
  return variabelen.filter((v) => v.type === "NUMBER");
}
