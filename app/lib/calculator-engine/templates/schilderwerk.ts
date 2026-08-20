import type { CalculatorConfigData, DerivedVariable } from "../types";
import { afmetingenSubvariabelen, productKeuzePrijsVariabele } from "../fields";
import { delen, isGelijkAanTekst, isWaar, perEenheidRegel, vermenigvuldigen } from "./helpers";
import type { CalculatorTemplate } from "./types";

const AFMETING_VELD_ID = "afmeting";
const TYPE_VERF_VELD_ID = "typeVerf";
const { oppervlakte: OPPERVLAKTE_VAR } = afmetingenSubvariabelen(AFMETING_VELD_ID, false);
const OPPERVLAKTE_KEER_LAGEN_VAR = "oppervlakteKeerLagen";

function bouwConfig(): CalculatorConfigData {
  const afgeleideVariabelen: DerivedVariable[] = [
    {
      id: OPPERVLAKTE_KEER_LAGEN_VAR,
      label: "Oppervlakte × aantal lagen",
      type: "NUMBER",
      expression: vermenigvuldigen({ kind: "VARIABELE", naam: OPPERVLAKTE_VAR }, { kind: "VARIABELE", naam: "aantalLagen" }),
    },
  ];

  return {
    versie: 1,
    calculatorType: "OPPERVLAKTE",
    velden: [
      { id: AFMETING_VELD_ID, label: "Te schilderen oppervlak", soort: "AFMETINGEN", verplicht: true, eenheid: "meter", metHoogte: false },
      {
        id: "binnenBuiten",
        label: "Binnen of buiten?",
        soort: "DROPDOWN",
        verplicht: true,
        standaardWaarde: "binnen",
        opties: [
          { waarde: "binnen", label: "Binnen" },
          { waarde: "buiten", label: "Buiten" },
        ],
      },
      { id: "aantalLagen", label: "Aantal lagen verf", soort: "AANTAL", verplicht: true, standaardWaarde: 2, min: 1 },
      { id: "ondergrondVoorbereiden", label: "Ondergrond schuren/plamuren?", soort: "JA_NEE", verplicht: false },
      {
        id: TYPE_VERF_VELD_ID,
        label: "Welke verfkwaliteit?",
        soort: "PRODUCT_KEUZE",
        verplicht: true,
        materialCategoryId: TYPE_VERF_VELD_ID,
      },
    ],
    afgeleideVariabelen,
    regels: [
      perEenheidRegel(
        { id: "materiaal", label: "Verf", categorie: "MATERIAAL" },
        { kind: "VARIABELE", naam: OPPERVLAKTE_KEER_LAGEN_VAR },
        { kind: "VARIABELE", naam: productKeuzePrijsVariabele(TYPE_VERF_VELD_ID) },
        "m²"
      ),
      perEenheidRegel(
        { id: "arbeid", label: "Schilderwerk (arbeid)", categorie: "ARBEID" },
        delen({ kind: "VARIABELE", naam: OPPERVLAKTE_KEER_LAGEN_VAR }, { kind: "GETAL", waarde: 12 }),
        { kind: "GETAL", waarde: 42 },
        "uur"
      ),
      perEenheidRegel(
        { id: "voorbereiding", label: "Voorbereiding ondergrond", categorie: "ARBEID", voorwaarde: isWaar("ondergrondVoorbereiden") },
        { kind: "VARIABELE", naam: OPPERVLAKTE_VAR },
        { kind: "GETAL", waarde: 6 },
        "m²"
      ),
      {
        id: "buitenToeslag",
        label: "Buitenwerk (steiger/weersbescherming)",
        categorie: "TOESLAG",
        type: "PERCENTAGE",
        basis: { kind: "VARIABELE", naam: "$subtotaal" },
        percentage: { kind: "GETAL", waarde: 20 },
        voorwaarde: isGelijkAanTekst("binnenBuiten", "buiten"),
        actief: true,
        intern: false,
        toonInUitsplitsing: true,
      },
    ],
    stappen: [
      { id: "oppervlak", titel: "Oppervlak", veldIds: [AFMETING_VELD_ID, "binnenBuiten"] },
      { id: "details", titel: "Details", veldIds: ["aantalLagen", "ondergrondVoorbereiden", TYPE_VERF_VELD_ID] },
    ],
    resultaatInstellingen: {
      weergave: "VANAF",
      afronding: "HEEL_EURO",
      ctaType: "OFFERTE_AANVRAGEN",
      ctaTekst: null,
      toelichting: null,
      bandbreedteMargeOmlaag: 10,
      bandbreedteMargeOmhoog: 10,
    },
  };
}

export const schilderwerkTemplate: CalculatorTemplate = {
  id: "schilderwerk",
  naam: "Schilderwerk",
  categorie: "Schilder",
  beschrijving: "Binnen of buiten, aantal lagen, voorbereiding en verfkwaliteit.",
  watHetBerekent: "Een vanaf-prijs op basis van oppervlakte, aantal lagen en gekozen verfkwaliteit.",
  resterendWerk: "Vul je eigen verfprijzen in — de rest werkt direct.",
  icoon: "PaintRoller",
  calculatorType: "OPPERVLAKTE",
  bouwConfig,
  materiaalKeuzes: [
    {
      veldId: TYPE_VERF_VELD_ID,
      opties: [
        { naam: "Standaard", prijs: 8 },
        { naam: "Premium", prijs: 14 },
      ],
    },
  ],
};
