import type { CalculatorConfigData } from "../types";
import { productKeuzePrijsVariabele } from "../fields";
import { delen, isGelijkAanTekst, isWaar, percentageRegel, perEenheidRegel, vastRegel } from "./helpers";
import type { CalculatorTemplate } from "./types";

const TYPE_SCHUTTING_VELD_ID = "typeSchutting";

function bouwConfig(): CalculatorConfigData {
  return {
    versie: 1,
    calculatorType: "PRODUCT",
    velden: [
      { id: "lengte", label: "Hoeveel meter schutting?", soort: "NUMMER", verplicht: true, eenheid: "meter", min: 0 },
      {
        id: TYPE_SCHUTTING_VELD_ID,
        label: "Welk type schutting?",
        soort: "PRODUCT_KEUZE",
        verplicht: true,
        materialCategoryId: TYPE_SCHUTTING_VELD_ID,
      },
      { id: "aantalHoeken", label: "Aantal hoeken", soort: "AANTAL", verplicht: false, standaardWaarde: 0 },
      { id: "poort", label: "Poort toevoegen?", soort: "JA_NEE", verplicht: false },
      { id: "oudeSchuttingVerwijderen", label: "Oude schutting verwijderen?", soort: "JA_NEE", verplicht: false },
      {
        id: "bereikbaarheid",
        label: "Hoe goed is de tuin bereikbaar?",
        soort: "DROPDOWN",
        verplicht: true,
        standaardWaarde: "goed",
        opties: [
          { waarde: "goed", label: "Goed (materiaal kan tot bij de schutting)" },
          { waarde: "matig", label: "Matig (een stukje sjouwen)" },
          { waarde: "slecht", label: "Slecht (alles met de hand)" },
        ],
      },
    ],
    afgeleideVariabelen: [],
    regels: [
      perEenheidRegel(
        { id: "materiaal", label: "Materiaal", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: "lengte" },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(TYPE_SCHUTTING_VELD_ID) },
        "meter"
      ),
      perEenheidRegel(
        { id: "arbeid", label: "Plaatsen (arbeid)", categorie: "ARBEID" },
        delen({ kind: "VARIABELE", naam: "lengte" }, { kind: "GETAL", waarde: 4 }),
        { kind: "GETAL", waarde: 48 },
        "uur"
      ),
      perEenheidRegel(
        { id: "hoektoeslag", label: "Hoektoeslag", categorie: "TOESLAG" },
        { kind: "VARIABELE", naam: "aantalHoeken" },
        { kind: "GETAL", waarde: 45 },
        "hoek"
      ),
      vastRegel({ id: "poortkosten", label: "Poort", categorie: "MATERIAAL", voorwaarde: isWaar("poort") }, 275),
      perEenheidRegel(
        { id: "sloopkosten", label: "Oude schutting verwijderen", categorie: "TOESLAG", voorwaarde: isWaar("oudeSchuttingVerwijderen") },
        { kind: "VARIABELE", naam: "lengte" },
        { kind: "GETAL", waarde: 12 },
        "meter"
      ),
      percentageRegel(
        { id: "bereikbaarheidToeslag", label: "Beperkte bereikbaarheid", categorie: "TOESLAG", voorwaarde: isGelijkAanTekst("bereikbaarheid", "slecht") },
        15
      ),
    ],
    stappen: [
      { id: "afmeting", titel: "Schutting", veldIds: ["lengte", TYPE_SCHUTTING_VELD_ID] },
      { id: "extra", titel: "Extra's", veldIds: ["aantalHoeken", "poort", "oudeSchuttingVerwijderen", "bereikbaarheid"] },
    ],
    resultaatInstellingen: {
      weergave: "RANGE",
      afronding: "HEEL_EURO",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: null,
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 15,
    },
  };
}

export const schuttingTemplate: CalculatorTemplate = {
  id: "schutting",
  naam: "Schutting",
  categorie: "Hovenier",
  beschrijving: "Lengte, materiaalkeuze, hoeken, poort en bereikbaarheid — de klassieke schuttingcalculator.",
  watHetBerekent: "Een prijsindicatie op basis van lengte, materiaal en extra's zoals hoeken en een poort.",
  resterendWerk: "Vul je eigen prijzen per materiaal in — de rest werkt direct.",
  icoon: "Fence",
  calculatorType: "PRODUCT",
  bouwConfig,
  materiaalKeuzes: [
    {
      veldId: TYPE_SCHUTTING_VELD_ID,
      opties: [
        { naam: "Grenen", prijs: 65 },
        { naam: "Douglas", prijs: 80 },
        { naam: "Composiet", prijs: 135 },
      ],
    },
  ],
};
